package webapp

import (
	"bytes"
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testHandler(t *testing.T) http.Handler {
	return testHandlerWithScript(t, "")
}

func testHandlerWithScript(t *testing.T, script string) http.Handler {
	t.Helper()
	h, ok, err := newHandler(fstest.MapFS{
		".gitkeep":                         {},
		"index.html":                       {Data: []byte("<html><head></head>app</html>" + strings.Repeat(" ", 2048))},
		"version":                          {Data: []byte("Sat Oct 17 2026\n")},
		"main.0123456789abcdef0123.js":     {Data: []byte(strings.Repeat("console.log(1);\n", 200))},
		"main.0123456789abcdef0123.js.map": {Data: []byte("{}")},
		"pokesprite-v12.png":               {Data: []byte("png")},
		"favicon/favicon-16x16.png":        {Data: []byte("icon")},
	}, script)
	require.NoError(t, err)
	require.True(t, ok)
	return h
}

func get(h http.Handler, method, target string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, target, nil)
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	return w
}

func TestCacheHeaders(t *testing.T) {
	h := testHandler(t)
	for target, want := range map[string]string{
		"/":                                 "no-cache",
		"/index.html":                       "no-cache",
		"/version":                          "no-cache",
		"/u/ash/living-dex":                 "no-cache",
		"/main.0123456789abcdef0123.js":     "public, max-age=31536000, immutable",
		"/main.0123456789abcdef0123.js.map": "public, max-age=31536000, immutable",
		"/pokesprite-v12.png":               "public, max-age=3600",
		"/favicon/favicon-16x16.png":        "public, max-age=3600",
	} {
		w := get(h, http.MethodGet, target, nil)
		assert.Equal(t, http.StatusOK, w.Code, target)
		assert.Equal(t, want, w.Header().Get("Cache-Control"), target)
		assert.NotEmpty(t, w.Header().Get("ETag"), target)
	}
}

func TestFrontendRoutesGetIndex(t *testing.T) {
	h := testHandler(t)

	w := get(h, http.MethodGet, "/u/ash/living-dex", nil)

	assert.True(t, strings.HasPrefix(w.Body.String(), "<html><head></head>app</html>"))
	assert.Contains(t, w.Header().Get("Content-Type"), "text/html")
}

func TestMissingFilesAreNotFound(t *testing.T) {
	h := testHandler(t)

	w := get(h, http.MethodGet, "/does-not-exist.png", nil)

	assert.Equal(t, http.StatusNotFound, w.Code, "a missing file isn't answered with index.html")
}

func TestETagRevalidation(t *testing.T) {
	h := testHandler(t)
	etag := get(h, http.MethodGet, "/pokesprite-v12.png", nil).Header().Get("ETag")

	w := get(h, http.MethodGet, "/pokesprite-v12.png", map[string]string{"If-None-Match": etag})

	assert.Equal(t, http.StatusNotModified, w.Code)
	assert.Empty(t, w.Body.String())
}

func TestHeadAndOtherMethods(t *testing.T) {
	h := testHandler(t)

	assert.Equal(t, http.StatusOK, get(h, http.MethodHead, "/", nil).Code)
	assert.Equal(t, http.StatusMethodNotAllowed, get(h, http.MethodPost, "/", nil).Code)
}

func TestPathsCantEscapeTheBuild(t *testing.T) {
	h := testHandler(t)

	for _, target := range []string{"/../../go.mod", "/%2e%2e/%2e%2e/go.sum", "/..%2f..%2fwebapp.go"} {
		w := get(h, http.MethodGet, target, nil)
		// Files are only ever looked up in the build, so anything outside it is
		// a frontend route at worst.
		assert.True(t, strings.HasPrefix(w.Body.String(), "<html><head></head>app</html>") || w.Code == http.StatusNotFound, target)
		assert.NotContains(t, w.Body.String(), "module", target)
	}
}

func TestNoBuildMeansNoHandler(t *testing.T) {
	_, ok, err := newHandler(fstest.MapFS{".gitkeep": {}}, "")

	require.NoError(t, err)
	assert.False(t, ok)
}

func TestDottedFrontendRoutesGetIndex(t *testing.T) {
	h := testHandler(t)

	w := get(h, http.MethodGet, "/u/ash/v1.2", nil)

	assert.Equal(t, http.StatusOK, w.Code, "a dex slug with a dot is a frontend route, not a missing file")
	assert.True(t, strings.HasPrefix(w.Body.String(), "<html><head></head>app</html>"))
}

func TestGzip(t *testing.T) {
	h := testHandler(t)
	plain := get(h, http.MethodGet, "/main.0123456789abcdef0123.js", nil)

	w := get(h, http.MethodGet, "/main.0123456789abcdef0123.js", map[string]string{"Accept-Encoding": "br, gzip;q=0.8"})

	assert.Equal(t, "gzip", w.Header().Get("Content-Encoding"))
	assert.Equal(t, "Accept-Encoding", w.Header().Get("Vary"))
	assert.Contains(t, w.Header().Get("Content-Type"), "javascript")
	assert.NotEqual(t, plain.Header().Get("ETag"), w.Header().Get("ETag"), "each encoding has its own ETag")
	reader, err := gzip.NewReader(bytes.NewReader(w.Body.Bytes()))
	require.NoError(t, err)
	body, err := io.ReadAll(reader)
	require.NoError(t, err)
	assert.Equal(t, plain.Body.String(), string(body))

	// Gzipped responses are always whole, even when a range is asked for, so
	// a bad range can't produce an error body labeled as gzip.
	for _, byteRange := range []string{"bytes=0-9", "bytes=99999999-"} {
		ranged := get(h, http.MethodGet, "/main.0123456789abcdef0123.js", map[string]string{"Accept-Encoding": "gzip", "Range": byteRange})
		assert.Equal(t, http.StatusOK, ranged.Code, byteRange)
		assert.Equal(t, w.Body.Bytes(), ranged.Body.Bytes(), byteRange)
	}

	// The type is the same either way.
	assert.Equal(t, plain.Header().Get("Content-Type"), w.Header().Get("Content-Type"))

	for _, refused := range []string{"gzip;q=0", "gzip; q=0.0", "GZIP;Q=0.000", "br"} {
		assert.Empty(t, get(h, http.MethodGet, "/main.0123456789abcdef0123.js", map[string]string{"Accept-Encoding": refused}).Header().Get("Content-Encoding"), refused)
	}
	assert.Equal(t, "gzip", get(h, http.MethodGet, "/main.0123456789abcdef0123.js", map[string]string{"Accept-Encoding": "GZIP;q=0.5"}).Header().Get("Content-Encoding"))
	assert.Empty(t, get(h, http.MethodGet, "/pokesprite-v12.png", map[string]string{"Accept-Encoding": "gzip"}).Header().Get("Content-Encoding"), "images aren't recompressed")
	assert.Empty(t, get(h, http.MethodGet, "/version", map[string]string{"Accept-Encoding": "gzip"}).Header().Get("Content-Encoding"), "tiny files aren't worth it")
}

func TestHeadScriptIsAddedToIndexOnly(t *testing.T) {
	plain := testHandler(t)
	h := testHandlerWithScript(t, "<script>window.X = 1;</script>")

	for _, target := range []string{"/", "/u/ash/living-dex"} {
		w := get(h, http.MethodGet, target, nil)
		assert.True(t, strings.HasPrefix(w.Body.String(), "<html><head><script>window.X = 1;</script></head>app</html>"), target)
	}
	assert.NotEqual(t, get(plain, http.MethodGet, "/", nil).Header().Get("ETag"), get(h, http.MethodGet, "/", nil).Header().Get("ETag"), "the ETag covers the added script")
	assert.NotContains(t, get(h, http.MethodGet, "/main.0123456789abcdef0123.js", nil).Body.String(), "window.X")
}

func TestHeadScriptNeedsAHead(t *testing.T) {
	_, _, err := newHandler(fstest.MapFS{"index.html": {Data: []byte("<html>no head</html>")}}, "<script></script>")

	assert.Error(t, err)
}
