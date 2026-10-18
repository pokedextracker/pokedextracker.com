// Package webapp serves the frontend build that's embedded into the API
// binary. Webpack writes the build into dist/. When webpack hasn't run, dist/
// only holds .gitkeep and there's no frontend to serve; development uses the
// webpack dev server instead.
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
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/pkg/errors"
)

//go:embed all:dist
var embedded embed.FS

const indexFile = "index.html"

// hashedAsset matches files whose names contain webpack's content hash, like
// main.0123456789abcdef0123.js. A new build gets a new name, so they can be
// cached forever.
var hashedAsset = regexp.MustCompile(`\.[0-9a-f]{16,}\.(js|css)(\.map)?$`)

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
}

// Handler serves the embedded frontend build. headScript, when given, is
// added to the end of index.html's <head>; the server uses it to hand the
// frontend its configuration. The boolean is false when the binary was built
// without a frontend.
func Handler(headScript string) (http.Handler, bool, error) {
	root, err := fs.Sub(embedded, "dist")
	if err != nil {
		return nil, false, errors.WithStack(err)
	}
	return newHandler(root, headScript)
}

func newHandler(root fs.FS, headScript string) (http.Handler, bool, error) {
	files := map[string]*file{}
	err := fs.WalkDir(root, ".", func(name string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() || path.Base(name) == ".gitkeep" {
			return err
		}
		content, err := fs.ReadFile(root, name)
		if err != nil {
			return err
		}
		if name == indexFile && headScript != "" {
			if !bytes.Contains(content, []byte("</head>")) {
				return errors.New("index.html has no </head> to add the config before")
			}
			content = bytes.Replace(content, []byte("</head>"), []byte(headScript+"</head>"), 1)
		}
		// Embedded files have no modification time, so caches revalidate with a
		// fingerprint of the content instead.
		sum := sha256.Sum256(content)
		files[name] = &file{content: content, etag: hex.EncodeToString(sum[:8])}
		return nil
	})
	if err != nil {
		return nil, false, errors.WithStack(err)
	}
	if _, ok := files[indexFile]; !ok {
		return nil, false, nil
	}
	go func() {
		for name, f := range files {
			if compressible[strings.ToLower(path.Ext(name))] && len(f.content) >= minimumGzipSize {
				f.gzip()
			}
		}
	}()
	return &handler{files: files}, true, nil
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

func (f *file) gzip() []byte {
	f.gzipOnce.Do(func() {
		var buffer bytes.Buffer
		writer := gzip.NewWriter(&buffer)
		_, _ = writer.Write(f.content)
		_ = writer.Close()
		f.gzipped = buffer.Bytes()
	})
	return f.gzipped
}

// acceptsGzip reports whether the request's Accept-Encoding lists gzip with a
// nonzero quality (gzip;q=0 means "not gzip").
func acceptsGzip(r *http.Request) bool {
	for _, part := range strings.Split(r.Header.Get("Accept-Encoding"), ",") {
		encoding, params, _ := strings.Cut(strings.TrimSpace(part), ";")
		if !strings.EqualFold(strings.TrimSpace(encoding), "gzip") {
			continue
		}
		for _, param := range strings.Split(params, ";") {
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
	case ".ico":
		return "image/x-icon"
	}
	return ""
}

// cacheControl decides how long browsers keep a file. index.html and /version
// say which build is current, so they're always revalidated. Hashed assets
// never change. Everything else (sprites, icons) is kept for an hour, then
// revalidated with its ETag.
func cacheControl(name string) string {
	switch {
	case name == indexFile || name == "version":
		return "no-cache"
	case hashedAsset.MatchString(name):
		return "public, max-age=31536000, immutable"
	default:
		return "public, max-age=3600"
	}
}
