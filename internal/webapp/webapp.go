// Package webapp serves the frontend build that's embedded into the API
// binary. Webpack writes the build into dist/; source-only builds (tests, Air,
// CI's Go job) only have dist/.gitkeep and serve no frontend.
package webapp

import (
	"bytes"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"io/fs"
	"net/http"
	"path"
	"regexp"
	"strings"
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

type file struct {
	content []byte
	etag    string
}

type handler struct {
	files map[string]file
}

// Handler serves the embedded frontend build. It returns nil when the binary
// was built without one.
func Handler() (http.Handler, error) {
	root, err := fs.Sub(embedded, "dist")
	if err != nil {
		return nil, errors.WithStack(err)
	}
	return newHandler(root)
}

func newHandler(root fs.FS) (http.Handler, error) {
	files := map[string]file{}
	err := fs.WalkDir(root, ".", func(name string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() || path.Base(name) == ".gitkeep" {
			return err
		}
		content, err := fs.ReadFile(root, name)
		if err != nil {
			return err
		}
		// Embedded files have no modification time, so caches revalidate with a
		// fingerprint of the content instead.
		sum := sha256.Sum256(content)
		files[name] = file{content: content, etag: `"` + hex.EncodeToString(sum[:8]) + `"`}
		return nil
	})
	if err != nil {
		return nil, errors.WithStack(err)
	}
	if _, ok := files[indexFile]; !ok {
		return nil, nil
	}
	return &handler{files: files}, nil
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
		// A missing file is a 404. Anything else is a frontend route, which the
		// app renders from index.html, including its own not found page.
		if path.Ext(name) != "" {
			w.Header().Set("Cache-Control", "no-cache")
			http.NotFound(w, r)
			return
		}
		name = indexFile
		f = h.files[indexFile]
	}

	w.Header().Set("Cache-Control", cacheControl(name))
	w.Header().Set("ETag", f.etag)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, name, time.Time{}, bytes.NewReader(f.content))
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
