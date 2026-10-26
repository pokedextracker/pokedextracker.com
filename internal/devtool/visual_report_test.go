package devtool

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
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
	assert.Equal(t, []string{"[webkit-desktop] profile › edit dex modal"}, failure.Interrupted, "an error quoting the spec's toHaveScreenshot isn't a screenshot that differs, and a dropped connection says nothing about the page")
	assert.Empty(t, failure.Failed)
	assert.Equal(t, []string{
		"[webkit-phone] profile › create dex modal",
		"[chromium-phone] profile › someone else's profile",
	}, failure.Flaky, "a page that only sometimes renders right isn't a pass, though its error says how long it waited")
	assert.Equal(t, "visual tests: 1 differ, 2 passed only on a retry, 1 cut off", failure.Error())
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
				{"title": "night home", "tests": [
					{"projectName": "webkit-desktop", "status": "flaky", "results": [
						{"errors": [{"message": "Error: page.goto: Operation was cancelled; maybe frame was detached?\nCall log: ..."}]},
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
		"[webkit-desktop] tracker › night home (Error: page.goto: Operation was cancelled; maybe frame was detached?)",
	}, retried, "a busy machine or a dropped connection isn't a difference")
}

// A test that ran out of time, or waited for something that never appeared,
// was slow rather than different. These are the messages WebKit's busy
// attempts leave.
func TestVisualReportPassesRetriesThatOnlyRanOutOfTime(t *testing.T) {
	flaky := func(title string, messages ...string) string {
		var errs []string
		for _, m := range messages {
			quoted, _ := json.Marshal(m)
			errs = append(errs, `{"message": `+string(quoted)+`}`)
		}
		return `{"title": "` + title + `", "tests": [{"projectName": "webkit-desktop", "status": "flaky", "results": [
			{"errors": [` + strings.Join(errs, ", ") + `]}, {"errors": []}
		]}]}`
	}
	report := writeReport(t, `{"errors": [], "suites": [{"title": "pages.spec.ts", "specs": [], "suites": [{
		"title": "tracker",
		"specs": [`+strings.Join([]string{
		// What the timeout interrupted fails too, once the page is gone.
		flaky("search",
			"Test timeout of 60000ms exceeded.",
			"Error: mouse.move: Protocol error (Input.dispatchMouseEvent): Page closed\n\n   at fixtures.ts:147"),
		flaky("info link hovered",
			"Test timeout of 60000ms exceeded.",
			"Error: locator.hover: Test ended.",
			`Fixture "trace recording" timeout of 60000ms exceeded during teardown.`),
		// The screenshot's element hadn't appeared, so no screenshot was taken.
		flaky("info button hovered",
			"Test timeout of 60000ms exceeded.",
			"Error: expect(locator).toHaveScreenshot(expected) failed\n\nLocator: getByTestId('box').first()\nTimeout: 10000ms\n  Timeout 10000ms exceeded.\n\n  Snapshot: dex-info-button-hovered.png\n\nCall log:\n  \x1b[2m- Expect \"toHaveScreenshot(dex-info-button-hovered.png)\" getByTestId('box').first() with timeout 10000ms\x1b[22m\n\x1b[2m    - verifying given screenshot expectation\x1b[22m\n\x1b[2m  - waiting for getByTestId('box').first()\x1b[22m\n\x1b[2m  - Timeout 10000ms exceeded.\x1b[22m\n"),
		// The screenshot was still being taken: nothing was compared.
		flaky("legends: arceus dex",
			"Error: expect(page).toHaveScreenshot(expected) failed\n\nTimeout: 10000ms\n  Timeout 10000ms exceeded.\n\nCall log:\n  - Expect \"toHaveScreenshot(dex-legends-arceus.png)\" with timeout 10000ms\n    - generating new stable screenshot expectation\n  - taking page screenshot\n    - disabled all CSS animations\n  - waiting for fonts to load...\n  - fonts loaded\n  - Timeout 10000ms exceeded.\n\n\n  211 |     await expect(page.getByTestId(\"progress-count\")).toContainText(\"3 caught\");\n> 213 |     await expect(page).toHaveScreenshot(\"dex-legends-arceus.png\");\n"),
		flaky("info tab hovered",
			"Error: expect(locator).toContainText(expected) failed\n\nLocator: getByTestId('progress-count')\nExpected substring: \"7 caught\"\nTimeout: 10000ms\nError: element(s) not found\n\nCall log:\n  \x1b[2m- Expect \"toContainText\" getByTestId('progress-count') with timeout 10000ms\x1b[22m\n\x1b[2m  - waiting for getByTestId('progress-count')\x1b[22m\n"),
		// These saw the page and it was wrong, so they aren't slowness: a
		// wrong value, a screenshot that kept changing, an element that isn't
		// visible, and a screenshot that couldn't be taken.
		flaky("hide caught",
			"Error: expect(locator).toContainText(expected) failed\n\nLocator: getByTestId('progress-count')\nExpected substring: \"7 caught\"\nReceived string: \"(6 caught, 231 to go)\"\nTimeout: 10000ms\n\nCall log:\n  - Expect \"toContainText\" getByTestId('progress-count') with timeout 10000ms\n  - waiting for getByTestId('progress-count')\n    14 × locator resolved to <p data-testid=\"progress-count\">(6 caught, 231 to go)</p>\n       - unexpected value \"(6 caught, 231 to go)\"\n"),
		flaky("tile hovered",
			"Error: expect(locator).toHaveScreenshot(expected) failed\n\nTimeout: 10000ms\n  Timeout 10000ms exceeded.\n\nCall log:\n  - Expect \"toHaveScreenshot(dex-tile-hovered.png)\" getByTestId('box').first() with timeout 10000ms\n    - generating new stable screenshot expectation\n  - waiting for getByTestId('box').first()\n    - locator resolved to <div data-testid=\"box\">…</div>\n  - taking element screenshot\n  - 12 pixels (ratio 0.01 of all image pixels) are different.\n  - waiting 100ms before taking screenshot\n  - Timeout 10000ms exceeded.\n"),
		flaky("info link hovered (hidden)",
			"Error: expect(locator).toHaveScreenshot(expected) failed\n\nTimeout: 10000ms\n  Timeout 10000ms exceeded.\n\nCall log:\n  - Expect \"toHaveScreenshot(dex-info-link-hovered.png)\" getByTestId('info-main') with timeout 10000ms\n    - generating new stable screenshot expectation\n  - waiting for getByTestId('info-main')\n    - locator resolved to <div data-testid=\"info-main\">…</div>\n  - taking element screenshot\n    - disabled all CSS animations\n  - waiting for element to be visible and stable\n    - element is not visible\n  - retrying scroll into view action\n    - waiting 100ms\n  - taking element screenshot\n  - Timeout 10000ms exceeded.\n"),
		flaky("edit dex modal",
			"Error: expect(locator).toHaveScreenshot(expected) failed\n\nTimeout: 10000ms\n  Timeout 10000ms exceeded.\n\nCall log:\n  - Expect \"toHaveScreenshot(dex-edit.png)\" getByRole('dialog') with timeout 10000ms\n    - generating new stable screenshot expectation\n  - taking element screenshot\n  - failed to take screenshot - Node has 0 height.\n  - waiting 100ms\n  - taking element screenshot\n  - Timeout 10000ms exceeded.\n"),
	}, ", ")+`]
	}]}]}`)

	retried, err := report.failure(errors.New("exit status 1"))

	var failure *VisualFailure
	require.ErrorAs(t, err, &failure)
	assert.Equal(t, []string{
		"[webkit-desktop] tracker › search (Test timeout of 60000ms exceeded.)",
		"[webkit-desktop] tracker › info link hovered (Test timeout of 60000ms exceeded.)",
		"[webkit-desktop] tracker › info button hovered (Test timeout of 60000ms exceeded.)",
		"[webkit-desktop] tracker › legends: arceus dex (Error: expect(page).toHaveScreenshot(expected) failed)",
		"[webkit-desktop] tracker › info tab hovered (Error: expect(locator).toContainText(expected) failed)",
	}, retried)
	assert.Equal(t, []string{
		"[webkit-desktop] tracker › hide caught",
		"[webkit-desktop] tracker › tile hovered",
		"[webkit-desktop] tracker › info link hovered (hidden)",
		"[webkit-desktop] tracker › edit dex modal",
	}, failure.Flaky, "a page that came out wrong is still a result")
}

// A test cut off by a timeout or a dropped connection on every attempt has no
// screenshot, so the run fails, but it says the machine or Docker had trouble
// rather than that the test broke. Waiting alone doesn't: an element missing
// every time could be the page.
func TestVisualReportListsTestsCutOffOnEveryAttempt(t *testing.T) {
	report := writeReport(t, `{"errors": [], "suites": [{"title": "pages.spec.ts", "specs": [], "suites": [{
		"title": "tooltips",
		"specs": [
			{"title": "evolution notes", "tests": [{"projectName": "webkit-desktop", "status": "unexpected", "results": [
				{"errors": [{"message": "Test timeout of 60000ms exceeded."}, {"message": "Error: apiRequestContext.post: socket hang up (ECONNRESET)"}]},
				{"errors": [{"message": "Test timeout of 60000ms exceeded."}, {"message": "Error: locator.click: Test timeout of 60000ms exceeded."}]}
			]}]},
			{"title": "register heading", "tests": [{"projectName": "webkit-desktop", "status": "unexpected", "results": [
				{"errors": [{"message": "Test timeout of 60000ms exceeded."}]},
				{"errors": [{"message": "Error: locator.click: Element is outside of the viewport"}]}
			]}]},
			{"title": "share panel", "tests": [{"projectName": "webkit-desktop", "status": "unexpected", "results": [
				{"errors": [{"message": "Error: expect(locator).toBeVisible() failed\n\nLocator: getByTestId('share')\nExpected: visible\nTimeout: 10000ms\nError: element(s) not found"}]},
				{"errors": [{"message": "Error: expect(locator).toBeVisible() failed\n\nLocator: getByTestId('share')\nExpected: visible\nTimeout: 10000ms\nError: element(s) not found"}]}
			]}]}
		]
	}]}]}`)

	_, err := report.failure(errors.New("exit status 1"))

	var failure *VisualFailure
	require.ErrorAs(t, err, &failure)
	assert.Equal(t, []string{"[webkit-desktop] tooltips › evolution notes"}, failure.Interrupted)
	assert.Equal(t, []string{
		"[webkit-desktop] tooltips › register heading",
		"[webkit-desktop] tooltips › share panel",
	}, failure.Failed, "one real error, or only waiting, makes it a failure")
	assert.Equal(t, "visual tests: 2 failed, 1 cut off", failure.Error())
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
