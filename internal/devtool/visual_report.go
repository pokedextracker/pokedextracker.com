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
	// Interrupted are tests that only timed out or lost their connection, on
	// every attempt. They have no screenshot, so they don't pass, but they say
	// the machine or Docker had trouble rather than anything about the page.
	Interrupted []string
}

// onlyInterrupted reports whether every test that didn't pass was cut off,
// rather than failing or differing.
func (f *VisualFailure) onlyInterrupted() bool {
	return len(f.Interrupted) > 0 && len(f.Differ)+len(f.Failed)+len(f.Flaky) == 0
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
	if n := len(f.Interrupted); n > 0 {
		parts = append(parts, fmt.Sprintf("%d timed out", n))
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
	// The files an attempt left, like a screenshot comparison's expected,
	// actual, and diff images.
	Attachments []playwrightAttachment `json:"attachments"`
}

type playwrightAttachment struct {
	Name string `json:"name"`
	Path string `json:"path"`
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
	for _, test := range r.tests() {
		switch test.outcome() {
		case outcomeDiffer:
			failure.Differ = append(failure.Differ, test.name)
		case outcomeFailed:
			failure.Failed = append(failure.Failed, test.name)
		case outcomeFlaky:
			failure.Flaky = append(failure.Flaky, test.name)
		case outcomeInterrupted:
			failure.Interrupted = append(failure.Interrupted, test.name)
		case outcomeRetried:
			hiccup, _ := onlyHiccups(test.Results)
			retried = append(retried, test.name+" ("+hiccup+")")
		case outcomePassed:
		}
	}
	if len(failure.Differ)+len(failure.Failed)+len(failure.Flaky)+len(failure.Interrupted) > 0 {
		return retried, &failure
	}
	if len(retried) > 0 {
		return retried, nil
	}
	return nil, fmt.Errorf("playwright: %w", runErr)
}

// namedTest is one test in a report, named "[project] describe › title".
type namedTest struct {
	name string
	playwrightTest
}

// tests lists every test in the report, in order.
func (r *playwrightReport) tests() []namedTest {
	var tests []namedTest
	var walk func(suite playwrightSuite, titles []string)
	walk = func(suite playwrightSuite, titles []string) {
		for _, spec := range suite.Specs {
			title := strings.Join(append(append([]string{}, titles...), spec.Title), " › ")
			for _, test := range spec.Tests {
				tests = append(tests, namedTest{name: fmt.Sprintf("[%s] %s", test.ProjectName, title), playwrightTest: test})
			}
		}
		for _, child := range suite.Suites {
			walk(child, append(append([]string{}, titles...), child.Title))
		}
	}
	// The top level is one suite per spec file, whose title is the file name.
	for _, file := range r.Suites {
		walk(file, nil)
	}
	return tests
}

// visualOutcome is how a visual test came out, as the terminal's lists and
// the review page both sort it.
type visualOutcome int

const (
	// Passed, including a test that was skipped.
	outcomePassed visualOutcome = iota
	// Its screenshot differed on every attempt.
	outcomeDiffer
	// It failed before or apart from its screenshot.
	outcomeFailed
	// It passed only on a retry, after a difference or an error that isn't a
	// hiccup.
	outcomeFlaky
	// It passed on a retry after only hiccups, which counts as a pass.
	outcomeRetried
	// Every attempt only timed out or lost its connection, at least one cut off
	// while it wasn't waiting for an element, so it has no screenshot.
	outcomeInterrupted
)

func (t playwrightTest) outcome() visualOutcome {
	switch t.Status {
	case "flaky":
		if _, ok := onlyHiccups(t.Results); ok {
			return outcomeRetried
		}
		return outcomeFlaky
	case "unexpected":
		if differed(t.Results) {
			return outcomeDiffer
		}
		// Only timeouts on every attempt, so there's no screenshot. Waits alone,
		// like an element missing every time, could be the page.
		if _, ok := onlyHiccups(t.Results); ok && interrupted(t.Results) {
			return outcomeInterrupted
		}
		return outcomeFailed
	}
	return outcomePassed
}

// hiccups are errors that say something interrupted a test rather than went
// wrong with the page: a busy machine, or Docker's connection to the server.
// They're matched in lowercase against the first line of an error, which says
// what failed. The rest can say "timeout" for any reason: every failed
// assertion lists how long it waited, so assertions go by ranOutWaiting
// instead.
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
	// What a test timeout interrupts, once its page is gone.
	"page closed",
	"test ended",
	"exceeded during teardown",
}

// interrupted reports whether any attempt at a test was cut off by one of the
// hiccups while it wasn't waiting for an element. An action like a click
// waits for its element until the test runs out of time, so an element that
// never appears can also end in a test timeout.
func interrupted(results []playwrightResult) bool {
	for _, result := range results {
		cutOff, waiting := false, false
		for _, err := range result.Errors {
			cutOff = cutOff || isInterruption(err.Message)
			waiting = waiting || waitingForElement(lastStep(ansiCodes.ReplaceAllString(err.Message, "")))
		}
		if cutOff && !waiting {
			return true
		}
	}
	return false
}

// onlyHiccups reports whether every error in a test's attempts was a hiccup
// and none was a difference, and returns the first one. It errs towards no:
// an error it doesn't recognize, including a reworded difference or a step
// ranOutWaiting doesn't know, keeps the test from passing.
func onlyHiccups(results []playwrightResult) (string, bool) {
	if differed(results) {
		return "", false
	}
	first := ""
	for _, result := range results {
		for _, err := range result.Errors {
			if !isHiccup(err.Message) {
				return "", false
			}
			if first == "" {
				first = firstLine(err.Message)
			}
		}
	}
	return first, first != ""
}

// isHiccup reports whether an error is a hiccup: an interruption (see
// hiccups), or an assertion that ran out of time before it saw the page (see
// ranOutWaiting). An assertion that saw the page and got the wrong value, or a
// screenshot that came out wrong, is a result.
func isHiccup(message string) bool {
	if strings.Contains(strings.ToLower(firstLine(message)), "expect(") {
		return ranOutWaiting(ansiCodes.ReplaceAllString(message, ""))
	}
	return isInterruption(message)
}

// isInterruption reports whether an error's first line is one of the hiccups.
func isInterruption(message string) bool {
	lower := strings.ToLower(firstLine(message))
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

// ranOutWaiting reports whether a failed assertion ran out of time before it
// saw the page: still waiting for its element to appear, or still taking its
// screenshot. It goes by the last step in Playwright's call log and accepts
// only those steps, so anything else, like an element that isn't visible or a
// screenshot that couldn't be taken, keeps it a result.
func ranOutWaiting(message string) bool {
	for _, saw := range []string{"\nReceived", "not visible", "failed to take screenshot"} {
		if strings.Contains(message, saw) {
			return false
		}
	}
	if strings.Contains(message, "element(s) not found") {
		return true
	}
	last := lastStep(message)
	if waitingForElement(last) {
		return true
	}
	// A screenshot compares only once it's taken, and one that kept changing
	// logs the pixels that did.
	if !strings.Contains(firstLine(message), "toHaveScreenshot") || strings.Contains(message, "pixels") {
		return false
	}
	for _, step := range screenshotSteps {
		if strings.HasPrefix(last, step) {
			return true
		}
	}
	return false
}

// lastStep is the last step in an error's call log, apart from the timeout
// itself, or empty when it has none.
func lastStep(message string) string {
	_, log, ok := strings.Cut(message, "Call log:")
	if !ok {
		return ""
	}
	last := ""
	for _, line := range strings.Split(log, "\n") {
		step, ok := strings.CutPrefix(strings.TrimSpace(line), "- ")
		if ok && !strings.HasPrefix(step, "Timeout ") {
			last = step
		}
	}
	return last
}

// waitingForElement reports whether a call log's last step is waiting for an
// element to appear.
func waitingForElement(step string) bool {
	return strings.HasPrefix(step, "waiting for getBy") || strings.HasPrefix(step, "waiting for locator(")
}

// screenshotSteps are the steps Playwright logs while it's taking a
// screenshot, before it compares anything.
var screenshotSteps = []string{
	"generating new stable screenshot expectation",
	"verifying given screenshot expectation",
	"taking page screenshot",
	"taking element screenshot",
	"disabled all CSS animations",
	"waiting for fonts to load",
	"fonts loaded",
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
