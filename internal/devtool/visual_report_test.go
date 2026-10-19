package devtool

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// writeReport writes contents as a visual run's JSON report and reads it back.
func writeReport(t *testing.T, contents string) *playwrightReport {
	t.Helper()
	path := filepath.Join(t.TempDir(), "results-branch.json")
	require.NoError(t, os.WriteFile(path, []byte(contents), 0o600))
	report, err := readVisualReport(path)
	require.NoError(t, err)
	return report
}

func TestVisualReportSortsWhatDidNotPass(t *testing.T) {
	// Trimmed from a real report: one suite per file, then describe blocks.
	report := writeReport(t, `{
		"errors": [],
		"suites": [{
			"title": "pages.spec.ts",
			"specs": [],
			"suites": [{
				"title": "profile",
				"specs": [
					{"title": "own profile", "tests": [
						{"projectName": "webkit-desktop", "status": "unexpected", "results": [
							{"errors": [{"message": "Error: \u001b[2mexpect(\u001b[22mpage\u001b[2m).\u001b[22mtoHaveScreenshot\u001b[2m(\u001b[22mexpected\u001b[2m)\u001b[22m failed\n\n  6002 pixels (ratio 0.01 of all image pixels) are different."}]}
						]},
						{"projectName": "webkit-phone", "status": "expected", "results": [{"errors": []}]}
					]},
					{"title": "edit dex modal", "tests": [
						{"projectName": "webkit-desktop", "status": "unexpected", "results": [
							{"errors": [{"message": "Error: page.goto: Connection terminated unexpectedly\n\n  > 231 |     await expect(page).toHaveScreenshot(\"account.png\", { fullPage: true });"}]}
						]}
					]},
					{"title": "create dex modal", "tests": [
						{"projectName": "webkit-phone", "status": "flaky", "results": [
							{"errors": [{"message": "Error: expect(page).toHaveScreenshot(expected) failed\n\n  231 pixels (ratio 0.01 of all image pixels) are different."}]},
							{"errors": []}
						]}
					]},
					{"title": "someone else's profile", "tests": [
						{"projectName": "chromium-phone", "status": "flaky", "results": [
							{"errors": [{"message": "Error: \u001b[2mexpect(\u001b[22m\u001b[31mlocator\u001b[39m\u001b[2m).\u001b[22mtoContainText\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m)\u001b[22m failed\n\nLocator: locator('.percentage h3')\nExpected substring: \u001b[32m\"7 caught\"\u001b[39m\nReceived string:    \u001b[31m\"Something went wrong\"\u001b[39m\nTimeout: 10000ms\n\nCall log:\n\u001b[2m  - Expect \"toContainText\" with timeout 10000ms\u001b[22m\n\u001b[2m  - waiting for locator('.percentage h3')\u001b[22m\n"}]},
							{"errors": []}
						]}
					]}
				]
			}]
		}]
	}`)

	retried, err := report.failure(errors.New("exit status 1"))

	var failure *VisualFailure
	require.ErrorAs(t, err, &failure)
	assert.Empty(t, retried)
	assert.Equal(t, []string{"[webkit-desktop] profile › own profile"}, failure.Differ)
	assert.Equal(t, []string{"[webkit-desktop] profile › edit dex modal"}, failure.Failed, "an error quoting the spec's toHaveScreenshot isn't a screenshot that differs")
	assert.Equal(t, []string{
		"[webkit-phone] profile › create dex modal",
		"[chromium-phone] profile › someone else's profile",
	}, failure.Flaky, "a page that only sometimes renders right isn't a pass, though its error says how long it waited")
	assert.Equal(t, "visual tests: 1 differ, 1 failed, 2 passed only on a retry", failure.Error())
}

func TestVisualReportPutsErrorsOutsideTheSpecsFirst(t *testing.T) {
	report := writeReport(t, `{
		"errors": [{"message": "Error: The server didn't answer within 30 seconds\n    at waitForServer"}],
		"suites": []
	}`)

	_, err := report.failure(errors.New("exit status 1"))

	var failure *VisualFailure
	assert.False(t, errors.As(err, &failure), "not mistaken for screenshots that differ")
	assert.EqualError(t, err, "playwright: Error: The server didn't answer within 30 seconds")
}

func TestVisualReportPassesTestsRetriedForHiccups(t *testing.T) {
	report := writeReport(t, `{
		"errors": [],
		"suites": [{"title": "pages.spec.ts", "specs": [], "suites": [{
			"title": "tracker",
			"specs": [
				{"title": "search", "tests": [
					{"projectName": "webkit-phone", "status": "flaky", "results": [
						{"errors": [
							{"message": "Test timeout of 60000ms exceeded."},
							{"message": "Error: page.goto: Test timeout of 60000ms exceeded.\nCall log:\n\u001b[2m  - navigating to \"http://host.docker.internal:8700/login\", waiting until \"load\"\u001b[22m\n"}
						]},
						{"errors": []}
					]}
				]},
				{"title": "hide caught", "tests": [
					{"projectName": "webkit-desktop", "status": "flaky", "results": [
						{"errors": [{"message": "Error: page.goto: Connection terminated unexpectedly\nCall log: ..."}]},
						{"errors": []}
					]}
				]},
				{"title": "own dex", "tests": [
					{"projectName": "firefox-desktop", "status": "flaky", "results": [
						{"errors": [{"message": "Error: expect(page).toHaveScreenshot(expected) failed\n\nTimeout: 10000ms\n  Timeout 10000ms exceeded."}]},
						{"errors": []}
					]}
				]}
			]
		}]}]
	}`)

	retried, err := report.failure(errors.New("exit status 1"))

	var failure *VisualFailure
	require.ErrorAs(t, err, &failure)
	assert.Equal(t, []string{"[firefox-desktop] tracker › own dex"}, failure.Flaky, "a screenshot that never settled isn't a hiccup")
	assert.Equal(t, []string{
		"[webkit-phone] tracker › search (Test timeout of 60000ms exceeded.)",
		"[webkit-desktop] tracker › hide caught (Error: page.goto: Connection terminated unexpectedly)",
	}, retried, "a busy machine or a dropped connection isn't a difference")
}

func TestVisualReportPassesARunWhoseOnlyRetriesWereHiccups(t *testing.T) {
	report := writeReport(t, `{
		"errors": [],
		"suites": [{"title": "pages.spec.ts", "specs": [], "suites": [{
			"title": "signed out",
			"specs": [{"title": "login", "tests": [
				{"projectName": "webkit-desktop", "status": "flaky", "results": [
					{"errors": [{"message": "Error: page.goto: Connection terminated unexpectedly"}]},
					{"errors": []}
				]}
			]}]
		}]}]
	}`)

	retried, err := report.failure(errors.New("exit status 1"))

	assert.NoError(t, err)
	assert.Equal(t, []string{"[webkit-desktop] signed out › login (Error: page.goto: Connection terminated unexpectedly)"}, retried)
}

func TestVisualReportFallsBackToTheExitError(t *testing.T) {
	report := writeReport(t, `{"errors": [], "suites": []}`)

	_, err := report.failure(errors.New("exit status 1"))

	assert.EqualError(t, err, "playwright: exit status 1")
}

func TestVisualReportIsMissingWhenPlaywrightNeverRan(t *testing.T) {
	_, err := readVisualReport(filepath.Join(t.TempDir(), "results-branch.json"))

	assert.ErrorIs(t, err, os.ErrNotExist)
}
