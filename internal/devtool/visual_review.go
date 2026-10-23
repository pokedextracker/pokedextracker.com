package devtool

import (
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// visualReview is a page showing every screenshot of a visual comparison:
// the ones that changed, before and after with the difference highlighted,
// and the ones that didn't. A change that's meant to alter how the site looks
// is reviewed on it place by place, and it says what stayed the same.
type visualReview struct {
	Ref string
	// Screenshots that differed on every attempt.
	Changed []reviewShot
	// Screenshots that differed on an attempt and then matched: noise, or a
	// change that only happens some of the time.
	Sometimes []reviewShot
	// Tests that failed before or apart from their screenshot.
	Failed []reviewFailure
	// The reference's screenshots that matched, by project. The report doesn't
	// say which screenshot a failed test would have taken, so theirs are here
	// too, and the page says so.
	Unchanged []reviewGroup
}

// reviewShot is one screenshot that differed. Its images are paths relative
// to the page.
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

// reviewDir is where the review page and the images it shows are written.
func reviewDir(env Environment) string {
	return filepath.Join(visualDir(env), "review")
}

// writeVisualReview writes the review page for the last comparison with ref,
// from this branch's report, and returns the page's path. It copies the
// images that changed next to it, so the page still shows them after the
// next run, and links the unchanged ones where the reference left them.
func writeVisualReview(env Environment, ref string, report *playwrightReport) (string, error) {
	dir := reviewDir(env)
	if err := os.RemoveAll(dir); err != nil {
		return "", fmt.Errorf("clear the last review page: %w", err)
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("create %s: %w", dir, err)
	}
	review, err := buildVisualReview(env, ref, report)
	if err != nil {
		return "", err
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

// buildVisualReview sorts every screenshot of the last comparison, copying
// the images of the ones that differed into the review directory.
func buildVisualReview(env Environment, ref string, report *playwrightReport) (*visualReview, error) {
	review := &visualReview{Ref: ref}
	// The reference screenshots that differed, so they aren't listed as
	// unchanged too.
	differed := map[string]bool{}
	var walkErr error
	report.eachTest(func(name string, test playwrightTest) {
		if walkErr != nil {
			return
		}
		switch test.Status {
		case "unexpected", "flaky":
			shots, err := copyDifferences(env, name, test.Results, len(review.Changed)+len(review.Sometimes))
			if err != nil {
				walkErr = err
				return
			}
			for _, shot := range shots {
				differed[shot.reference] = true
				if test.Status == "unexpected" {
					review.Changed = append(review.Changed, shot.reviewShot)
				} else {
					review.Sometimes = append(review.Sometimes, shot.reviewShot)
				}
			}
			if len(shots) == 0 && test.Status == "unexpected" {
				review.Failed = append(review.Failed, reviewFailure{Name: name, Error: firstError(test.Results)})
			}
		}
	})
	if walkErr != nil {
		return nil, walkErr
	}
	unchanged, err := unchangedScreenshots(env, differed)
	if err != nil {
		return nil, err
	}
	review.Unchanged = unchanged
	return review, nil
}

// copiedShot is a screenshot that differed, with the reference's own path.
type copiedShot struct {
	reviewShot
	reference string
}

// copyDifferences copies the expected, actual, and diff images of the first
// attempt that has them into the review directory, numbering them from
// start so their names don't collide.
func copyDifferences(env Environment, name string, results []playwrightResult, start int) ([]copiedShot, error) {
	for _, result := range results {
		// A test can take more than one screenshot; each comparison that
		// failed attaches its three images, named after the screenshot.
		images := map[string]map[string]string{}
		for _, attachment := range result.Attachments {
			for _, kind := range []string{"expected", "actual", "diff"} {
				base, ok := strings.CutSuffix(attachment.Name, "-"+kind+".png")
				if ok && attachment.Path != "" {
					if images[base] == nil {
						images[base] = map[string]string{}
					}
					images[base][kind] = attachment.Path
				}
			}
		}
		var bases []string
		for base, kinds := range images {
			if kinds["expected"] != "" && kinds["actual"] != "" && kinds["diff"] != "" {
				bases = append(bases, base)
			}
		}
		if len(bases) == 0 {
			continue
		}
		sort.Strings(bases)
		var shots []copiedShot
		for i, base := range bases {
			shot := copiedShot{reference: images[base]["expected"]}
			shot.Name = name
			if len(bases) > 1 {
				shot.Name += " (" + base + ")"
			}
			for kind, target := range map[string]*string{"expected": &shot.Before, "actual": &shot.After, "diff": &shot.Diff} {
				file := fmt.Sprintf("%03d-%s.png", start+i+1, kind)
				if err := copyFile(images[base][kind], filepath.Join(reviewDir(env), file)); err != nil {
					return nil, err
				}
				*target = file
			}
			shots = append(shots, shot)
		}
		return shots, nil
	}
	return nil, nil
}

// unchangedScreenshots lists the reference's screenshots that didn't differ,
// by project, with paths relative to the review page.
func unchangedScreenshots(env Environment, differed map[string]bool) ([]reviewGroup, error) {
	root := filepath.Join(visualDir(env), "screenshots")
	groups := map[string]*reviewGroup{}
	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			if os.IsNotExist(err) && path == root {
				return filepath.SkipDir
			}
			return err
		}
		if entry.IsDir() || filepath.Ext(path) != ".png" || differed[path] {
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
			Path: "../screenshots/" + filepath.ToSlash(rel),
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

// eachTest calls fn with every test in the report, named "[project]
// describe › title" like the launcher's lists.
func (r *playwrightReport) eachTest(fn func(name string, test playwrightTest)) {
	var walk func(suite playwrightSuite, titles []string)
	walk = func(suite playwrightSuite, titles []string) {
		for _, spec := range suite.Specs {
			title := strings.Join(append(append([]string{}, titles...), spec.Title), " › ")
			for _, test := range spec.Tests {
				fn(fmt.Sprintf("[%s] %s", test.ProjectName, title), test)
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

func copyFile(from, to string) error {
	source, err := os.Open(from)
	if err != nil {
		return fmt.Errorf("copy %s: %w", from, err)
	}
	defer func() { _ = source.Close() }()
	target, err := os.Create(to)
	if err != nil {
		return fmt.Errorf("copy %s: %w", from, err)
	}
	if _, err := io.Copy(target, source); err != nil {
		_ = target.Close()
		return fmt.Errorf("copy %s: %w", from, err)
	}
	return target.Close()
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
<p><b>{{len .Changed}}</b> changed{{if .Sometimes}}, <b>{{len .Sometimes}}</b> changed only some of the time{{end}}{{if .Failed}}, <b>{{len .Failed}}</b> failed before their screenshot{{end}}. Click an image to open it full size.</p>
{{define "shot"}}
<h3>{{.Name}}</h3>
<div class="row">
  <figure><figcaption>Before</figcaption><a href="{{.Before}}"><img src="{{.Before}}" alt="before"></a></figure>
  <figure><figcaption>After</figcaption><a href="{{.After}}"><img src="{{.After}}" alt="after"></a></figure>
  <figure><figcaption>Difference</figcaption><a href="{{.Diff}}"><img src="{{.Diff}}" alt="difference"></a></figure>
</div>
{{end}}
{{if .Changed}}<h2>Changed</h2>{{range .Changed}}{{template "shot" .}}{{end}}{{end}}
{{if .Sometimes}}<h2>Changed only some of the time</h2>
<p>These differed on one attempt and matched on another: noise, or a change that only happens some of the time. Running the comparison again tells you which.</p>
{{range .Sometimes}}{{template "shot" .}}{{end}}{{end}}
{{if .Failed}}<h2>Failed before their screenshot</h2><ul>{{range .Failed}}<li><b>{{.Name}}</b>: {{.Error}}</li>{{end}}</ul>{{end}}
<h2>Unchanged</h2>
{{if .Failed}}<p>Includes the screenshots of the tests that failed above, which weren't compared.</p>{{end}}
{{range .Unchanged}}<details><summary>{{.Project}} ({{len .Shots}})</summary><div class="grid">
{{range .Shots}}<figure><figcaption>{{.Name}}</figcaption><a href="{{.Path}}"><img src="{{.Path}}" alt="{{.Name}}" loading="lazy"></a></figure>{{end}}
</div></details>{{else}}<p>None.</p>{{end}}
`))
