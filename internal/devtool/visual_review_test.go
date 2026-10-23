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

const (
	differMessage = "Error: expect(page).toHaveScreenshot(expected) failed\n\n  600 pixels (ratio 0.01 of all image pixels) are different."
	clickMessage  = "Error: locator.click: Timeout 10000ms exceeded.\nCall log: ..."
	hiccupMessage = "Test timeout of 60000ms exceeded."
)

// reviewFixture lays out a visual run's files the way Playwright leaves them
// and returns its environment and this branch's report.
func reviewFixture(t *testing.T) (Environment, *playwrightReport) {
	t.Helper()
	env := Environment{CurrentRoot: t.TempDir()}
	shots := filepath.Join(visualDir(env), "screenshots", "chromium-desktop", "pages.spec.ts")
	for _, name := range []string{"home", "login", "register", "account", "profile", "search", "tracker", "pokedex", "dex-a", "dex-b"} {
		writeFile(t, filepath.Join(shots, name+".png"), "reference "+name)
	}
	results := filepath.Join(visualDir(env), "results-branch")
	// The attachments of an attempt whose screenshots named names differed.
	attachments := func(dir string, names ...string) string {
		var list []string
		for _, name := range names {
			list = append(list, fmt.Sprintf(`{"name": %q, "path": %q}, {"name": %q, "path": %q}, {"name": %q, "path": %q}`,
				name+"-expected.png", filepath.Join(shots, name+".png"),
				name+"-actual.png", filepath.Join(results, dir, name+"-actual.png"),
				name+"-diff.png", filepath.Join(results, dir, name+"-diff.png")))
		}
		list = append(list, `{"name": "error-context", "path": "elsewhere.md"}`)
		return "[" + strings.Join(list, ", ") + "]"
	}
	test := func(title, status string, results ...string) string {
		return fmt.Sprintf(`{"title": %q, "tests": [{"projectName": "chromium-desktop", "status": %q, "results": [%s]}]}`,
			title, status, strings.Join(results, ", "))
	}
	attempt := func(message, attachments string) string {
		if message == "" {
			return `{"errors": []}`
		}
		if attachments == "" {
			attachments = "[]"
		}
		return fmt.Sprintf(`{"errors": [{"message": %q}], "attachments": %s}`, message, attachments)
	}
	report := writeReport(t, `{"errors": [], "suites": [{"title": "pages.spec.ts", "specs": [], "suites": [{
		"title": "pages",
		"specs": [`+strings.Join([]string{
		test("home", "expected", attempt("", "")),
		test("login", "unexpected", attempt(differMessage, attachments("pages-login", "login"))),
		test("register", "flaky", attempt(differMessage, attachments("pages-register", "register")), attempt("", "")),
		test("account", "unexpected", attempt(clickMessage, "")),
		test("profile", "flaky", attempt(clickMessage, ""), attempt("", "")),
		test("search", "flaky", attempt(hiccupMessage, ""), attempt("", "")),
		test("tracker", "unexpected", attempt(differMessage, "")),
		test("pokedex", "flaky", attempt(differMessage, ""), attempt("", "")),
		test("dex", "unexpected", attempt(differMessage, ""), attempt(differMessage, attachments("pages-dex-retry1", "dex-b", "dex-a"))),
	}, ", ")+`]
	}]}]}`)
	return env, report
}

func TestVisualReviewSortsScreenshotsLikeTheTerminal(t *testing.T) {
	env, report := reviewFixture(t)

	review, err := buildVisualReview(env, "origin/master (abc1234)", report)

	require.NoError(t, err)
	assert.Equal(t, []reviewShot{
		{
			Name:   "[chromium-desktop] pages › login",
			Before: "../screenshots/chromium-desktop/pages.spec.ts/login.png",
			After:  "../results-branch/pages-login/login-actual.png",
			Diff:   "../results-branch/pages-login/login-diff.png",
		},
		{Name: "[chromium-desktop] pages › tracker"},
		{
			Name:   "[chromium-desktop] pages › dex (dex-a)",
			Before: "../screenshots/chromium-desktop/pages.spec.ts/dex-a.png",
			After:  "../results-branch/pages-dex-retry1/dex-a-actual.png",
			Diff:   "../results-branch/pages-dex-retry1/dex-a-diff.png",
		},
		{
			Name:   "[chromium-desktop] pages › dex (dex-b)",
			Before: "../screenshots/chromium-desktop/pages.spec.ts/dex-b.png",
			After:  "../results-branch/pages-dex-retry1/dex-b-actual.png",
			Diff:   "../results-branch/pages-dex-retry1/dex-b-diff.png",
		},
	}, review.Changed, "tracker's images are missing, and dex's are in its second attempt")
	assert.Equal(t, []reviewShot{
		{
			Name:   "[chromium-desktop] pages › register",
			Before: "../screenshots/chromium-desktop/pages.spec.ts/register.png",
			After:  "../results-branch/pages-register/register-actual.png",
			Diff:   "../results-branch/pages-register/register-diff.png",
		},
		{Name: "[chromium-desktop] pages › pokedex"},
	}, review.Sometimes, "screenshots that differed and then matched, pokedex's without its images")
	assert.Equal(t, []reviewFailure{
		{Name: "[chromium-desktop] pages › account", Error: "Error: locator.click: Timeout 10000ms exceeded."},
		{Name: "[chromium-desktop] pages › profile (then passed on a retry)", Error: "Error: locator.click: Timeout 10000ms exceeded."},
	}, review.Failed)
	// search only hit a hiccup and profile's retry matched, so they passed.
	// account's screenshot wasn't compared, but the report doesn't say which
	// it is, and tracker's and pokedex's images are missing from it.
	var unchanged []string
	for _, group := range review.Unchanged {
		assert.Equal(t, "chromium-desktop", group.Project)
		for _, shot := range group.Shots {
			unchanged = append(unchanged, shot.Name)
		}
	}
	assert.Equal(t, []string{"account", "home", "pokedex", "profile", "search", "tracker"}, unchanged)
	assert.True(t, review.Uncompared)
	assert.Equal(t, "../screenshots/chromium-desktop/pages.spec.ts/account.png", review.Unchanged[0].Shots[0].Path)
}

func TestVisualReviewWritesThePage(t *testing.T) {
	env, report := reviewFixture(t)

	page, err := writeVisualReview(env, "origin/master (abc1234)", report)

	require.NoError(t, err)
	assert.Equal(t, filepath.Join(reviewDir(env), "index.html"), page)
	contents, err := os.ReadFile(page)
	require.NoError(t, err)
	html := string(contents)
	assert.Contains(t, html, "Visual comparison with origin/master (abc1234)")
	assert.Contains(t, html, `<img src="../results-branch/pages-login/login-diff.png"`)
	assert.Contains(t, html, "[chromium-desktop] pages › register")
	assert.Contains(t, html, "Playwright's report doesn't have this screenshot's images", "for tracker")
	assert.Contains(t, html, "Error: locator.click: Timeout 10000ms exceeded.")
	assert.Contains(t, html, `../screenshots/chromium-desktop/pages.spec.ts/home.png`)
	assert.Contains(t, html, "Failed before or apart from their screenshot")
	assert.Contains(t, html, "the report doesn't say which screenshots those are")
	assert.Equal(t, 1, strings.Count(html, "<h2>Changed</h2>"))
}

func TestVisualReviewSaysWhenThereAreNoScreenshots(t *testing.T) {
	env := Environment{CurrentRoot: t.TempDir()}
	report := writeReport(t, `{"errors": [], "suites": []}`)

	page, err := writeVisualReview(env, "origin/master", report)

	require.NoError(t, err)
	contents, err := os.ReadFile(page)
	require.NoError(t, err)
	assert.Contains(t, string(contents), "<p>None.</p>")
	assert.NotContains(t, string(contents), "weren't compared", "the note is only there when a screenshot wasn't compared")
}

func TestVisualReviewTrustsARetryThatMatched(t *testing.T) {
	env := Environment{CurrentRoot: t.TempDir()}
	report := writeReport(t, `{"errors": [], "suites": [{"title": "pages.spec.ts", "specs": [
		{"title": "profile", "tests": [{"projectName": "chromium-desktop", "status": "flaky", "results": [
			{"errors": [{"message": "Error: locator.click: Timeout 10000ms exceeded."}]}, {"errors": []}
		]}]}
	], "suites": []}]}`)

	review, err := buildVisualReview(env, "origin/master", report)

	require.NoError(t, err)
	assert.Len(t, review.Failed, 1)
	assert.False(t, review.Uncompared, "its screenshot was compared on the retry, and matched")
}
