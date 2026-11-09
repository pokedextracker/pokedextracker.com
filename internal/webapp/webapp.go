// Package webapp serves the frontend build that's embedded into the API
// binary. Vite writes the build into dist/. When Vite hasn't built it, dist/
// only holds .gitkeep and there's no frontend to serve; development uses the
// Vite dev server instead.
package webapp

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"io/fs"
	"net/http"
	"path"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/pkg/errors"
)

//go:embed all:dist
var embedded embed.FS

const indexFile = "index.html"

// versionFile is the path the app polls to learn whether a new frontend has
// been deployed since it loaded. It isn't in the build; the handler answers it
// with the build ID.
const versionFile = "version"

// hashedAssets is where Vite puts the files whose names contain a hash of
// their content, like assets/index-B80ZTyZ2.js. A new build gets new names, so
// they can be cached forever. Files from public/ keep their names and go at
// the top level, so public/ must never have an assets/ folder: its files would
// be cached forever too.
const hashedAssets = "assets/"

// assetExtensions are file types the build contains. A missing path with one
// of these is a 404; any other path is a frontend route, even if it has a dot
// in it (like a dex slug).
var assetExtensions = map[string]bool{
	".css": true, ".gif": true, ".ico": true, ".jpeg": true, ".jpg": true, ".js": true, ".json": true,
	".map": true, ".png": true, ".svg": true, ".txt": true, ".webp": true, ".xml": true,
}

// compressible are the text types worth gzipping. Images are already
// compressed.
var compressible = map[string]bool{
	"": true, ".css": true, ".html": true, ".js": true, ".json": true, ".map": true, ".svg": true, ".txt": true, ".xml": true,
}

// minimumGzipSize skips files too small to be worth compressing.
const minimumGzipSize = 1024

type file struct {
	content []byte
	etag    string

	// The gzipped copy is made once per process: in the background at startup,
	// or by the first request that wants it, whichever comes first.
	gzipOnce sync.Once
	gzipped  []byte
}

type handler struct {
	files map[string]*file

	// With a PageFunc, index.html is cut around its page block, and each
	// request for it gets its own block in between.
	page        PageFunc
	indexBefore []byte
	indexAfter  []byte
}

// The markers around the part of index.html that changes from page to page:
// the title, description, and the like. What's between them is the home
// page's, which the Vite dev server shows on every page.
const (
	pageStart = "<!-- page -->"
	pageEnd   = "<!-- /page -->"
)

// Page is what a frontend route gets in place of index.html's page block, and
// the status it's served with. A zero Status is 200.
type Page struct {
	Status int
	Head   string
}

// PageFunc decides the page block and status for a request to a frontend
// route. It's what lets search engines see each page's own title and
// description, and a real 404 for a page that doesn't exist.
type PageFunc func(r *http.Request) Page

// HeadScript returns what to add to the end of index.html's <head>, given the
// build ID. The server uses it to hand the frontend its configuration,
// including the build ID, which the app compares with /version.
type HeadScript func(build string) (string, error)

// Handler serves the embedded frontend build. headScript, when given, is
// added to the end of index.html's <head>. page, when given, replaces
// index.html's page block on each request. The boolean is false when the
// binary was built without a frontend.
func Handler(headScript HeadScript, page PageFunc) (http.Handler, bool, error) {
	root, err := fs.Sub(embedded, "dist")
	if err != nil {
		return nil, false, errors.WithStack(err)
	}
	return newHandler(root, headScript, page)
}

func newHandler(root fs.FS, headScript HeadScript, page PageFunc) (http.Handler, bool, error) {
	index, err := fs.ReadFile(root, indexFile)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, errors.WithStack(err)
	}
	build := buildID(index)
	script := ""
	if headScript != nil {
		if script, err = headScript(build); err != nil {
			return nil, false, errors.WithStack(err)
		}
	}

	files := map[string]*file{}
	err = fs.WalkDir(root, ".", func(name string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() || path.Base(name) == ".gitkeep" {
			return err
		}
		content, err := fs.ReadFile(root, name)
		if err != nil {
			return err
		}
		if name == indexFile && script != "" {
			if !bytes.Contains(content, []byte("</head>")) {
				return errors.New("index.html has no </head> to add the config before")
			}
			content = bytes.Replace(content, []byte("</head>"), []byte(script+"</head>"), 1)
		}
		files[name] = newFile(content)
		return nil
	})
	if err != nil {
		return nil, false, errors.WithStack(err)
	}
	files[versionFile] = newFile([]byte(build))
	h := &handler{files: files, page: page}
	if page != nil {
		before, rest, ok := bytes.Cut(files[indexFile].content, []byte(pageStart))
		_, after, ok2 := bytes.Cut(rest, []byte(pageEnd))
		if !ok || !ok2 {
			return nil, false, errors.New("index.html has no page block to replace")
		}
		h.indexBefore, h.indexAfter = before, after
	}
	go func() {
		for name, f := range files {
			if compressible[strings.ToLower(path.Ext(name))] && len(f.content) >= minimumGzipSize {
				f.gzip()
			}
		}
	}()
	return h, true, nil
}

func (h *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
	if name == "" {
		name = indexFile
	}
	f, ok := h.files[name]
	if !ok {
		// A missing asset is a 404. Anything else is a frontend route, which the
		// app renders from index.html, including its own not found page.
		if assetExtensions[strings.ToLower(path.Ext(name))] {
			w.Header().Set("Cache-Control", "no-cache")
			http.NotFound(w, r)
			return
		}
		name = indexFile
		f = h.files[indexFile]
	}
	if name == indexFile && h.page != nil {
		h.serveIndex(w, r)
		return
	}

	header := w.Header()
	header.Set("Cache-Control", cacheControl(name))
	header.Set("X-Content-Type-Options", "nosniff")

	// Set the type from the name for every file we know, so it's the same
	// gzipped or not, and doesn't depend on the host's MIME table.
	if contentType := typeByName(name); contentType != "" {
		header.Set("Content-Type", contentType)
	}

	content, etag := f.content, f.etag
	if compressible[strings.ToLower(path.Ext(name))] && len(f.content) >= minimumGzipSize {
		header.Add("Vary", "Accept-Encoding")
		if acceptsGzip(r) {
			content, etag = f.gzip(), f.etag+"-gzip"
			header.Set("Content-Encoding", "gzip")
			// Compressed responses are always whole. Browsers don't ask for
			// ranges of these files, and an error for a bad range would
			// otherwise go out labeled as gzip.
			r.Header.Del("Range")
			r.Header.Del("If-Range")
		}
	}
	// Each encoding is a different set of bytes, so each gets its own ETag.
	// Ranges then apply to the bytes actually sent.
	header.Set("ETag", `"`+etag+`"`)
	http.ServeContent(w, r, name, time.Time{}, bytes.NewReader(content))
}

// serveIndex serves index.html with the request's own page block and status.
func (h *handler) serveIndex(w http.ResponseWriter, r *http.Request) {
	page := h.page(r)
	content := make([]byte, 0, len(h.indexBefore)+len(page.Head)+len(h.indexAfter))
	content = append(content, h.indexBefore...)
	content = append(content, page.Head...)
	content = append(content, h.indexAfter...)

	header := w.Header()
	header.Set("Cache-Control", cacheControl(indexFile))
	header.Set("X-Content-Type-Options", "nosniff")
	header.Set("Content-Type", typeByName(indexFile))
	if len(content) >= minimumGzipSize {
		header.Add("Vary", "Accept-Encoding")
		if acceptsGzip(r) {
			content = gzipBytes(content)
			header.Set("Content-Encoding", "gzip")
			r.Header.Del("Range")
			r.Header.Del("If-Range")
		}
	}

	if page.Status != 0 && page.Status != http.StatusOK {
		// ServeContent only sends successes, and a page that doesn't exist has
		// nothing to revalidate or take a range of.
		header.Set("Content-Length", strconv.Itoa(len(content)))
		w.WriteHeader(page.Status)
		if r.Method != http.MethodHead {
			_, _ = w.Write(content)
		}
		return
	}
	header.Set("ETag", `"`+fingerprint(content)+`"`)
	http.ServeContent(w, r, indexFile, time.Time{}, bytes.NewReader(content))
}

func newFile(content []byte) *file {
	// Embedded files have no modification time, so caches revalidate with a
	// fingerprint of the content instead.
	return &file{content: content, etag: fingerprint(content)}
}

func fingerprint(content []byte) string {
	sum := sha256.Sum256(content)
	return hex.EncodeToString(sum[:8])
}

// buildID identifies a frontend build by its index.html, as Vite wrote it.
// The page links the JavaScript and CSS by names that contain a hash of their
// content, so the ID changes exactly when the app's code does, and rebuilding
// the same code gives the same ID. A deploy that only changes the backend
// keeps the ID, so open tabs aren't told to reload for nothing.
func buildID(index []byte) string {
	return fingerprint(index)
}

func (f *file) gzip() []byte {
	f.gzipOnce.Do(func() {
		f.gzipped = gzipBytes(f.content)
	})
	return f.gzipped
}

func gzipBytes(content []byte) []byte {
	var buffer bytes.Buffer
	writer := gzip.NewWriter(&buffer)
	_, _ = writer.Write(content)
	_ = writer.Close()
	return buffer.Bytes()
}

// acceptsGzip reports whether the request's Accept-Encoding lists gzip with a
// nonzero quality (gzip;q=0 means "not gzip").
func acceptsGzip(r *http.Request) bool {
	for part := range strings.SplitSeq(r.Header.Get("Accept-Encoding"), ",") {
		encoding, params, _ := strings.Cut(strings.TrimSpace(part), ";")
		if !strings.EqualFold(strings.TrimSpace(encoding), "gzip") {
			continue
		}
		for param := range strings.SplitSeq(params, ";") {
			key, value, _ := strings.Cut(strings.TrimSpace(param), "=")
			if strings.EqualFold(strings.TrimSpace(key), "q") {
				quality, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
				return err == nil && quality > 0
			}
		}
		return true
	}
	return false
}

// typeByName mirrors the content types ServeContent would pick, so a gzipped
// body isn't sniffed as application/x-gzip.
func typeByName(name string) string {
	switch strings.ToLower(path.Ext(name)) {
	case ".html":
		return "text/html; charset=utf-8"
	case ".js":
		return "text/javascript; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".json", ".map":
		return "application/json"
	case ".svg":
		return "image/svg+xml"
	case ".xml":
		return "text/xml; charset=utf-8"
	case ".txt", "":
		return "text/plain; charset=utf-8"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".ico":
		return "image/x-icon"
	}
	return ""
}

// cacheControl decides how long browsers keep a file. index.html and /version
// say which build is current, so they're always revalidated. Hashed assets
// never change. Everything else (icons, og.png, manifest.json) is kept for an
// hour, then revalidated with its ETag.
func cacheControl(name string) string {
	switch {
	case name == indexFile || name == versionFile:
		return "no-cache"
	case strings.HasPrefix(name, hashedAssets):
		return "public, max-age=31536000, immutable"
	default:
		return "public, max-age=3600"
	}
}
