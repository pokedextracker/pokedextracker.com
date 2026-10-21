package devtool

import (
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strings"
)

// VisualFailure means the visual comparison specs ran and some didn't pass,
// as opposed to the site, Docker, or Playwright's setup failing. Each list
// names tests as "[project] describe › title".
type VisualFailure struct {
	// Differ are screenshots that didn't match on any attempt.
	Differ []string
	// Failed are tests that failed before or apart from their screenshot,
	// like a selector that matched nothing.
	Failed []string
	// Flaky are tests that passed only on a retry, after a difference or an
	// error that isn't a known hiccup. That's either noise or a change that
	// only happens some of the time, so it isn't a pass.
	Flaky []string
}

func (f *VisualFailure) Error() string {
	var parts []string
	if n := len(f.Differ); n > 0 {
		parts = append(parts, fmt.Sprintf("%d differ", n))
	}
	if n := len(f.Failed); n > 0 {
		parts = append(parts, fmt.Sprintf("%d failed", n))
	}
	if n := len(f.Flaky); n > 0 {
		parts = append(parts, fmt.Sprintf("%d passed only on a retry", n))
	}
	return "visual tests: " + strings.Join(parts, ", ")
}

// playwrightReport is the part of Playwright's JSON report the launcher reads.
type playwrightReport struct {
	Suites []playwrightSuite `json:"suites"`
	Errors []playwrightError `json:"errors"`
}

type playwrightSuite struct {
	Title  string            `json:"title"`
	Specs  []playwrightSpec  `json:"specs"`
	Suites []playwrightSuite `json:"suites"`
}

type playwrightSpec struct {
	Title string           `json:"title"`
	Tests []playwrightTest `json:"tests"`
}

// playwrightTest is one spec in one project.
type playwrightTest struct {
	ProjectName string `json:"projectName"`
	// expected, unexpected, flaky, or skipped.
	Status  string             `json:"status"`
	Results []playwrightResult `json:"results"`
}

// playwrightResult is one attempt at a test.
type playwrightResult struct {
	Errors []playwrightError `json:"errors"`
}

type playwrightError struct {
	Message string `json:"message"`
}

// readVisualReport reads the JSON report a visual run wrote to path. A
// missing report means Playwright never got to the specs.
func readVisualReport(path string) (*playwrightReport, error) {
	contents, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var report playwrightReport
	if err := json.Unmarshal(contents, &report); err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	return &report, nil
}

// failure explains a run that exited with runErr. Errors outside any test,
// like the global setup failing, come first: they say nothing about the
// screenshots.
//
// Playwright fails the run for any test that passed on a retry
// (failOnFlakyTests in the config). One whose failed attempts were all
// hiccups, like a timeout while the machine was busy or a dropped connection
// to the server, still passes. Those tests come back in retried, with the
// first error each one hit, whether or not the run passed.
func (r *playwrightReport) failure(runErr error) (retried []string, err error) {
	if len(r.Errors) > 0 {
		return nil, fmt.Errorf("playwright: %s", firstLine(r.Errors[0].Message))
	}
	var failure VisualFailure
	// The top level is one suite per spec file, whose title is the file name.
	for _, file := range r.Suites {
		retried = failure.add(file, nil, retried)
	}
	if len(failure.Differ)+len(failure.Failed)+len(failure.Flaky) > 0 {
		return retried, &failure
	}
	if len(retried) > 0 {
		return retried, nil
	}
	return nil, fmt.Errorf("playwright: %w", runErr)
}

// add sorts the specs in suite that didn't pass into f, and appends the ones
// that passed after retrying only hiccups to retried.
func (f *VisualFailure) add(suite playwrightSuite, titles []string, retried []string) []string {
	for _, spec := range suite.Specs {
		title := strings.Join(append(append([]string{}, titles...), spec.Title), " › ")
		for _, test := range spec.Tests {
			name := fmt.Sprintf("[%s] %s", test.ProjectName, title)
			switch test.Status {
			case "flaky":
				if hiccup, ok := onlyHiccups(test.Results); ok {
					retried = append(retried, name+" ("+hiccup+")")
				} else {
					f.Flaky = append(f.Flaky, name)
				}
			case "unexpected":
				if differed(test.Results) {
					f.Differ = append(f.Differ, name)
				} else {
					f.Failed = append(f.Failed, name)
				}
			}
		}
	}
	for _, child := range suite.Suites {
		retried = f.add(child, append(append([]string{}, titles...), child.Title), retried)
	}
	return retried
}

// hiccups are errors that say something went wrong around a test rather than
// with the page: a busy machine, or Docker's connection to the server. They're
// matched in lowercase against the first line of an error, which says what
// failed. The rest can say "timeout" for any reason: every failed assertion
// lists how long it waited.
var hiccups = []string{
	"test timeout of",
	"page.goto: timeout",
	"net::err_",
	"ns_error_",
	"econnreset",
	"econnrefused",
	"connection terminated",
	// WebKit's page.goto when the load is cut off.
	"operation was cancelled",
	"could not connect",
	"has been closed",
}

// onlyHiccups reports whether every error in a test's attempts was a hiccup
// and none was a difference, and returns the first one. It errs towards no:
// an error it doesn't recognize, including a reworded difference, keeps the
// test from passing.
func onlyHiccups(results []playwrightResult) (string, bool) {
	if differed(results) {
		return "", false
	}
	first := ""
	for _, result := range results {
		for _, err := range result.Errors {
			line := firstLine(err.Message)
			if !isHiccup(line) {
				return "", false
			}
			if first == "" {
				first = line
			}
		}
	}
	return first, first != ""
}

// isHiccup reports whether the first line of an error is a hiccup. A failed
// assertion never is, whatever it says.
func isHiccup(line string) bool {
	lower := strings.ToLower(line)
	if strings.Contains(lower, "expect(") {
		return false
	}
	for _, hiccup := range hiccups {
		if strings.Contains(lower, hiccup) {
			return true
		}
	}
	return false
}

// differed reports whether any attempt at a test found its screenshot
// different from the reference, in pixels or in size. Only a comparison
// prints these: other errors can still mention toHaveScreenshot, since
// Playwright quotes the spec's code around where it failed.
func differed(results []playwrightResult) bool {
	for _, result := range results {
		for _, err := range result.Errors {
			message := ansiCodes.ReplaceAllString(err.Message, "")
			if strings.Contains(message, "pixels (ratio") || strings.Contains(message, "Expected an image") {
				return true
			}
		}
	}
	return false
}

// ansiCodes are the terminal colors Playwright puts in its messages.
var ansiCodes = regexp.MustCompile(`\x1b\[[0-9;]*m`)

// firstLine returns the first line of an error message, without colors.
func firstLine(message string) string {
	line, _, _ := strings.Cut(strings.TrimSpace(ansiCodes.ReplaceAllString(message, "")), "\n")
	return strings.TrimSpace(line)
}
