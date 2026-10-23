package devtool

import (
	"fmt"
	"html/template"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// visualReview is a page showing every screenshot of a visual comparison:
// the ones that changed, before and after with the difference highlighted,
// and the ones that didn't. A change meant to alter how the site looks is
// approved on it one screenshot at a time.
type visualReview struct {
	Ref string
	// Screenshots that differed on every attempt.
	Changed []reviewShot
	// Screenshots that differed on an attempt and then matched: noise, or a
	// change that only happens some of the time.
	Sometimes []reviewShot
	// Tests that failed before or apart from their screenshot, including ones
	// that then passed on a retry.
	Failed []reviewFailure
	// The reference's screenshots that matched, by project.
	Unchanged []reviewGroup
	// Uncompared is set when Unchanged can include screenshots that weren't
	// compared: the report doesn't say which screenshot a failed test would
	// have taken, or a differing one whose images are missing.
	Uncompared bool
}

// reviewShot is one screenshot that differed, with its images' paths
// relative to the page. They're empty when Playwright's report doesn't have
// them.
type reviewShot struct {
	Name                string
	Before, After, Diff string
}

type reviewFailure struct {
	Name, Error string
}

type reviewGroup struct {
	Project string
	Shots   []reviewImage
}

type reviewImage struct {
	Name, Path string
}

// reviewDir is where the review page is written. A run clears it before it
// starts, since the page links to screenshots and reports that the run
// replaces.
func reviewDir(env Environment) string {
	return filepath.Join(visualDir(env), "review")
}

// writeVisualReview writes the review page for the last comparison with ref,
// from this branch's report, and returns the page's path. It links to the
// images where Playwright left them: the reference's screenshots, and this
// branch's in its results.
func writeVisualReview(env Environment, ref string, report *playwrightReport) (string, error) {
	review, err := buildVisualReview(env, ref, report)
	if err != nil {
		return "", err
	}
	dir := reviewDir(env)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("create %s: %w", dir, err)
	}
	page := filepath.Join(dir, "index.html")
	file, err := os.Create(page)
	if err != nil {
		return "", fmt.Errorf("create the review page: %w", err)
	}
	defer func() { _ = file.Close() }()
	if err := reviewTemplate.Execute(file, review); err != nil {
		return "", fmt.Errorf("write the review page: %w", err)
	}
	return page, file.Close()
}

// buildVisualReview sorts every screenshot of the last comparison the way
// the terminal's lists do.
func buildVisualReview(env Environment, ref string, report *playwrightReport) (*visualReview, error) {
	review := &visualReview{Ref: ref}
	// The reference screenshots that differed, so they aren't listed as
	// unchanged too.
	compared := map[string]bool{}
	for _, test := range report.tests() {
		outcome := test.outcome()
		if outcome != outcomeDiffer && outcome != outcomeFailed && outcome != outcomeFlaky {
			continue
		}
		// A test that passed on a retry after an error rather than a difference
		// is listed with the failures, as the terminal lists it apart from
		// the differences.
		if outcome == outcomeFailed || (outcome == outcomeFlaky && !differed(test.Results)) {
			name := test.name
			if outcome == outcomeFlaky {
				name += " (then passed on a retry)"
			}
			review.Failed = append(review.Failed, reviewFailure{Name: name, Error: firstError(test.Results)})
			// A retry that passed compared its screenshot.
			review.Uncompared = review.Uncompared || outcome == outcomeFailed
			continue
		}
		comparisons := failedComparisons(test.name, test.Results)
		if len(comparisons) == 0 {
			comparisons = []comparison{{name: test.name}}
			review.Uncompared = true
		}
		for _, c := range comparisons {
			if c.expected != "" {
				compared[c.expected] = true
			}
			shot := reviewShot{Name: c.name, Before: pageLink(env, c.expected), After: pageLink(env, c.actual), Diff: pageLink(env, c.diff)}
			if outcome == outcomeDiffer {
				review.Changed = append(review.Changed, shot)
			} else {
				review.Sometimes = append(review.Sometimes, shot)
			}
		}
	}
	unchanged, err := unchangedScreenshots(env, compared)
	if err != nil {
		return nil, err
	}
	review.Unchanged = unchanged
	return review, nil
}

// comparison is one screenshot that didn't match, with the paths of its
// images. expected is the reference's own screenshot: the screenshots are
// taken in Docker with the worktree mounted at the same path, so it's the
// same path the reference side wrote.
type comparison struct {
	name                   string
	expected, actual, diff string
}

// failedComparisons finds the screenshots that didn't match in the first
// attempt that has all of their images. A test normally stops at its first
// one, but a soft assertion can fail more than one.
func failedComparisons(name string, results []playwrightResult) []comparison {
	for _, result := range results {
		images := map[string]*comparison{}
		for _, attachment := range result.Attachments {
			for _, kind := range []string{"expected", "actual", "diff"} {
				base, ok := strings.CutSuffix(attachment.Name, "-"+kind+".png")
				if !ok || attachment.Path == "" {
					continue
				}
				if images[base] == nil {
					images[base] = &comparison{}
				}
				switch kind {
				case "expected":
					images[base].expected = attachment.Path
				case "actual":
					images[base].actual = attachment.Path
				default:
					images[base].diff = attachment.Path
				}
			}
		}
		var bases []string
		for base, c := range images {
			if c.expected != "" && c.actual != "" && c.diff != "" {
				bases = append(bases, base)
			}
		}
		if len(bases) == 0 {
			continue
		}
		sort.Strings(bases)
		comparisons := make([]comparison, 0, len(bases))
		for _, base := range bases {
			c := *images[base]
			c.name = name
			if len(bases) > 1 {
				c.name += " (" + base + ")"
			}
			comparisons = append(comparisons, c)
		}
		return comparisons
	}
	return nil
}

// pageLink is path relative to the review page, or empty for no path.
func pageLink(env Environment, path string) string {
	if path == "" {
		return ""
	}
	rel, err := filepath.Rel(reviewDir(env), path)
	if err != nil {
		return filepath.ToSlash(path)
	}
	return filepath.ToSlash(rel)
}

// unchangedScreenshots lists the reference's screenshots that didn't differ,
// by project, with paths relative to the review page.
func unchangedScreenshots(env Environment, compared map[string]bool) ([]reviewGroup, error) {
	root := filepath.Join(visualDir(env), "screenshots")
	groups := map[string]*reviewGroup{}
	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			if os.IsNotExist(err) && path == root {
				return filepath.SkipDir
			}
			return err
		}
		if entry.IsDir() || filepath.Ext(path) != ".png" || compared[path] {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		// screenshots/{project}/{spec file}/{name}.png
		parts := strings.Split(filepath.ToSlash(rel), "/")
		project := parts[0]
		if groups[project] == nil {
			groups[project] = &reviewGroup{Project: project}
		}
		groups[project].Shots = append(groups[project].Shots, reviewImage{
			Name: strings.TrimSuffix(parts[len(parts)-1], ".png"),
			Path: pageLink(env, path),
		})
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("list the unchanged screenshots: %w", err)
	}
	var list []reviewGroup
	for _, group := range groups {
		list = append(list, *group)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Project < list[j].Project })
	return list, nil
}

// firstError is the first line of the first error in a test's attempts.
func firstError(results []playwrightResult) string {
	for _, result := range results {
		for _, err := range result.Errors {
			return firstLine(err.Message)
		}
	}
	return ""
}

var reviewTemplate = template.Must(template.New("review").Parse(`<!doctype html>
<meta charset="utf-8">
<title>Visual comparison with {{.Ref}}</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 24px; background: #f6f6f6; color: #222; }
  h2 { margin-top: 40px; }
  h3 { margin: 28px 0 8px; font-size: 14px; }
  .row { display: flex; gap: 12px; align-items: flex-start; }
  figure { margin: 0; padding: 8px; background: #fff; border: 1px solid #ddd; }
  figcaption { font-weight: 600; margin-bottom: 6px; }
  img { display: block; max-width: 420px; }
  .grid { display: flex; flex-wrap: wrap; gap: 12px; }
  .grid figure { width: 220px; }
  .grid img { max-width: 100%; }
  .grid figcaption { font-weight: 400; font-size: 12px; overflow-wrap: anywhere; }
  summary { cursor: pointer; font-weight: 600; margin: 12px 0; }
</style>
<h1>Visual comparison with {{.Ref}}</h1>
<p><b>{{len .Changed}}</b> changed{{if .Sometimes}}, <b>{{len .Sometimes}}</b> changed only some of the time{{end}}{{if .Failed}}, <b>{{len .Failed}}</b> failed before or apart from their screenshot{{end}}. Click an image to open it full size.</p>
{{define "shot"}}
<h3>{{.Name}}</h3>
{{if not .Diff}}<p>Playwright's report doesn't have this screenshot's images; its report in tmp/visual/report might.</p>{{else}}
<div class="row">
  <figure><figcaption>Before</figcaption><a href="{{.Before}}"><img src="{{.Before}}" alt="before"></a></figure>
  <figure><figcaption>After</figcaption><a href="{{.After}}"><img src="{{.After}}" alt="after"></a></figure>
  <figure><figcaption>Difference</figcaption><a href="{{.Diff}}"><img src="{{.Diff}}" alt="difference"></a></figure>
</div>{{end}}
{{end}}
{{if .Changed}}<h2>Changed</h2>{{range .Changed}}{{template "shot" .}}{{end}}{{end}}
{{if .Sometimes}}<h2>Changed only some of the time</h2>
<p>These differed on one attempt and matched on another: noise, or a change that only happens some of the time. Running the comparison again tells you which.</p>
{{range .Sometimes}}{{template "shot" .}}{{end}}{{end}}
{{if .Failed}}<h2>Failed before or apart from their screenshot</h2><ul>{{range .Failed}}<li><b>{{.Name}}</b>: {{.Error}}</li>{{end}}</ul>{{end}}
<h2>Unchanged</h2>
{{if .Uncompared}}<p>Can include the screenshots of the tests above that failed or whose images are missing, which weren't compared: the report doesn't say which screenshots those are.</p>{{end}}
{{range .Unchanged}}<details><summary>{{.Project}} ({{len .Shots}})</summary><div class="grid">
{{range .Shots}}<figure><figcaption>{{.Name}}</figcaption><a href="{{.Path}}"><img src="{{.Path}}" alt="{{.Name}}" loading="lazy"></a></figure>{{end}}
</div></details>{{else}}<p>None.</p>{{end}}
`))
