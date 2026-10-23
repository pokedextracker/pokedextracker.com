package devtool

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// writeFile writes contents to path, making its directories.
func writeFile(t *testing.T, path, contents string) {
	t.Helper()
	require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755))
	require.NoError(t, os.WriteFile(path, []byte(contents), 0o600))
}

// reviewFixture lays out a visual run's files the way Playwright leaves them
// and returns its environment and this branch's report.
func reviewFixture(t *testing.T) (Environment, *playwrightReport) {
	t.Helper()
	env := Environment{CurrentRoot: t.TempDir()}
	dir := visualDir(env)
	shots := filepath.Join(dir, "screenshots", "chromium-desktop", "pages.spec.ts")
	for _, name := range []string{"home", "login", "register", "account"} {
		writeFile(t, filepath.Join(shots, name+".png"), "reference "+name)
	}
	results := filepath.Join(dir, "results-branch")
	for _, test := range []struct{ dir, name string }{{"pages-login", "login"}, {"pages-register", "register"}} {
		writeFile(t, filepath.Join(results, test.dir, test.name+"-actual.png"), "actual "+test.name)
		writeFile(t, filepath.Join(results, test.dir, test.name+"-diff.png"), "diff "+test.name)
	}
	attachments := func(dir, name string) string {
		return fmt.Sprintf(`[
			{"name": %[3]q, "path": %[1]q},
			{"name": %[4]q, "path": %[2]q},
			{"name": %[5]q, "path": %[6]q},
			{"name": "error-context", "path": "elsewhere.md"}
		]`,
			filepath.Join(shots, name+".png"), filepath.Join(results, dir, name+"-actual.png"),
			name+"-expected.png", name+"-actual.png", name+"-diff.png", filepath.Join(results, dir, name+"-diff.png"))
	}
	report := writeReport(t, `{
		"errors": [],
		"suites": [{"title": "pages.spec.ts", "specs": [], "suites": [{
			"title": "signed out",
			"specs": [
				{"title": "home", "tests": [{"projectName": "chromium-desktop", "status": "expected", "results": [{"errors": []}]}]},
				{"title": "login", "tests": [{"projectName": "chromium-desktop", "status": "unexpected", "results": [
					{"errors": [{"message": "Error: 600 pixels (ratio 0.01 of all image pixels) are different."}], "attachments": `+attachments("pages-login", "login")+`}
				]}]},
				{"title": "register", "tests": [{"projectName": "chromium-desktop", "status": "flaky", "results": [
					{"errors": [{"message": "Error: 9 pixels (ratio 0.01 of all image pixels) are different."}], "attachments": `+attachments("pages-register", "register")+`},
					{"errors": []}
				]}]},
				{"title": "account", "tests": [{"projectName": "chromium-desktop", "status": "unexpected", "results": [
					{"errors": [{"message": "Error: locator.click: Timeout 10000ms exceeded.\nCall log: ..."}]}
				]}]}
			]
		}]}]
	}`)
	return env, report
}

func TestVisualReviewSortsEveryScreenshot(t *testing.T) {
	env, report := reviewFixture(t)
	require.NoError(t, os.MkdirAll(reviewDir(env), 0o755))

	review, err := buildVisualReview(env, "origin/master (abc1234)", report)

	require.NoError(t, err)
	assert.Equal(t, []reviewShot{{
		Name: "[chromium-desktop] signed out › login", Before: "001-expected.png", After: "001-actual.png", Diff: "001-diff.png",
	}}, review.Changed)
	assert.Equal(t, []reviewShot{{
		Name: "[chromium-desktop] signed out › register", Before: "002-expected.png", After: "002-actual.png", Diff: "002-diff.png",
	}}, review.Sometimes, "a screenshot that differed and then matched")
	assert.Equal(t, []reviewFailure{{
		Name: "[chromium-desktop] signed out › account", Error: "Error: locator.click: Timeout 10000ms exceeded.",
	}}, review.Failed)
	// account's screenshot was never taken on this side, but the report
	// doesn't say which one it is, so it's listed with the unchanged ones,
	// under a note; login and register differed.
	assert.Equal(t, []reviewGroup{{Project: "chromium-desktop", Shots: []reviewImage{
		{Name: "account", Path: "../screenshots/chromium-desktop/pages.spec.ts/account.png"},
		{Name: "home", Path: "../screenshots/chromium-desktop/pages.spec.ts/home.png"},
	}}}, review.Unchanged)

	for file, contents := range map[string]string{
		"001-expected.png": "reference login", "001-actual.png": "actual login", "001-diff.png": "diff login",
		"002-expected.png": "reference register",
	} {
		got, err := os.ReadFile(filepath.Join(reviewDir(env), file))
		require.NoError(t, err)
		assert.Equal(t, contents, string(got), file)
	}
}

func TestVisualReviewWritesThePage(t *testing.T) {
	env, report := reviewFixture(t)
	// Left from an earlier run, and gone after this one.
	writeFile(t, filepath.Join(reviewDir(env), "009-diff.png"), "old")

	page, err := writeVisualReview(env, "origin/master (abc1234)", report)

	require.NoError(t, err)
	assert.Equal(t, filepath.Join(reviewDir(env), "index.html"), page)
	contents, err := os.ReadFile(page)
	require.NoError(t, err)
	html := string(contents)
	assert.Contains(t, html, "Visual comparison with origin/master (abc1234)")
	assert.Contains(t, html, `<img src="001-diff.png"`)
	assert.Contains(t, html, "[chromium-desktop] signed out › register")
	assert.Contains(t, html, "Error: locator.click: Timeout 10000ms exceeded.")
	assert.Contains(t, html, `../screenshots/chromium-desktop/pages.spec.ts/home.png`)
	assert.Contains(t, html, "Includes the screenshots of the tests that failed above, which weren't compared.")
	assert.Equal(t, 1, strings.Count(html, "<h2>Changed</h2>"))
	assert.NoFileExists(t, filepath.Join(reviewDir(env), "009-diff.png"))
}

func TestVisualReviewWithNoScreenshots(t *testing.T) {
	env := Environment{CurrentRoot: t.TempDir()}
	report := writeReport(t, `{"errors": [], "suites": []}`)

	page, err := writeVisualReview(env, "origin/master", report)

	require.NoError(t, err)
	contents, err := os.ReadFile(page)
	require.NoError(t, err)
	assert.Contains(t, string(contents), "<p>None.</p>")
	assert.NotContains(t, string(contents), "failed above", "the note is only there when a test failed")
}
