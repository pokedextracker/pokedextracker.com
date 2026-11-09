package webapp

import (
	"bytes"
	"compress/gzip"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testHandler(t *testing.T) http.Handler {
	t.Helper()
	return testHandlerWith(t, testIndex, nil)
}

const testIndex = "<html><head></head>app</html>"

func testHandlerWith(t *testing.T, index string, headScript HeadScript) http.Handler {
	t.Helper()
	h, ok, err := newHandler(fstest.MapFS{
		".gitkeep":                        {},
		"index.html":                      {Data: []byte(index + strings.Repeat(" ", 2048))},
		"assets/index-B80ZTyZ2.js":        {Data: []byte(strings.Repeat("console.log(1);\n", 200))},
		"assets/index-B80ZTyZ2.js.map":    {Data: []byte("{}")},
		"assets/pokesprite-B-apAC5_.webp": {Data: []byte("webp")},
		"og.png":                          {Data: []byte("png")},
		"favicon/favicon-16x16.png":       {Data: []byte("icon")},
	}, headScript, nil)
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
	t.Parallel()

	h := testHandler(t)
	for target, want := range map[string]string{
		"/":                                "no-cache",
		"/index.html":                      "no-cache",
		"/version":                         "no-cache",
		"/u/ash/living-dex":                "no-cache",
		"/assets/index-B80ZTyZ2.js":        "public, max-age=31536000, immutable",
		"/assets/index-B80ZTyZ2.js.map":    "public, max-age=31536000, immutable",
		"/assets/pokesprite-B-apAC5_.webp": "public, max-age=31536000, immutable",
		"/og.png":                          "public, max-age=3600",
		"/favicon/favicon-16x16.png":       "public, max-age=3600",
	} {
		w := get(h, http.MethodGet, target, nil)
		assert.Equal(t, http.StatusOK, w.Code, target)
		assert.Equal(t, want, w.Header().Get("Cache-Control"), target)
		assert.NotEmpty(t, w.Header().Get("ETag"), target)
	}
}

func TestSpritesheetsAreWebP(t *testing.T) {
	t.Parallel()

	w := get(testHandler(t), http.MethodGet, "/assets/pokesprite-B-apAC5_.webp", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "image/webp", w.Header().Get("Content-Type"))
}

func TestFrontendRoutesGetIndex(t *testing.T) {
	t.Parallel()

	h := testHandler(t)

	w := get(h, http.MethodGet, "/u/ash/living-dex", nil)

	assert.True(t, strings.HasPrefix(w.Body.String(), "<html><head></head>app</html>"))
	assert.Contains(t, w.Header().Get("Content-Type"), "text/html")
}

func TestMissingFilesAreNotFound(t *testing.T) {
	t.Parallel()

	h := testHandler(t)

	w := get(h, http.MethodGet, "/does-not-exist.png", nil)

	assert.Equal(t, http.StatusNotFound, w.Code, "a missing file isn't answered with index.html")
}

func TestETagRevalidation(t *testing.T) {
	t.Parallel()

	h := testHandler(t)
	etag := get(h, http.MethodGet, "/og.png", nil).Header().Get("ETag")

	w := get(h, http.MethodGet, "/og.png", map[string]string{"If-None-Match": etag})

	assert.Equal(t, http.StatusNotModified, w.Code)
	assert.Empty(t, w.Body.String())
}

func TestHeadAndOtherMethods(t *testing.T) {
	t.Parallel()

	h := testHandler(t)

	assert.Equal(t, http.StatusOK, get(h, http.MethodHead, "/", nil).Code)
	assert.Equal(t, http.StatusMethodNotAllowed, get(h, http.MethodPost, "/", nil).Code)
}

func TestPathsCantEscapeTheBuild(t *testing.T) {
	t.Parallel()

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
	t.Parallel()

	_, ok, err := newHandler(fstest.MapFS{".gitkeep": {}}, nil, nil)

	require.NoError(t, err)
	assert.False(t, ok)
}

func TestDottedFrontendRoutesGetIndex(t *testing.T) {
	t.Parallel()

	h := testHandler(t)

	w := get(h, http.MethodGet, "/u/ash/v1.2", nil)

	assert.Equal(t, http.StatusOK, w.Code, "a dex slug with a dot is a frontend route, not a missing file")
	assert.True(t, strings.HasPrefix(w.Body.String(), "<html><head></head>app</html>"))
}

func TestGzip(t *testing.T) {
	t.Parallel()

	h := testHandler(t)
	plain := get(h, http.MethodGet, "/assets/index-B80ZTyZ2.js", nil)

	w := get(h, http.MethodGet, "/assets/index-B80ZTyZ2.js", map[string]string{"Accept-Encoding": "br, gzip;q=0.8"})

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
		ranged := get(h, http.MethodGet, "/assets/index-B80ZTyZ2.js", map[string]string{"Accept-Encoding": "gzip", "Range": byteRange})
		assert.Equal(t, http.StatusOK, ranged.Code, byteRange)
		assert.Equal(t, w.Body.Bytes(), ranged.Body.Bytes(), byteRange)
	}

	// The type is the same either way.
	assert.Equal(t, plain.Header().Get("Content-Type"), w.Header().Get("Content-Type"))

	for _, refused := range []string{"gzip;q=0", "gzip; q=0.0", "GZIP;Q=0.000", "br"} {
		assert.Empty(t, get(h, http.MethodGet, "/assets/index-B80ZTyZ2.js", map[string]string{"Accept-Encoding": refused}).Header().Get("Content-Encoding"), refused)
	}
	assert.Equal(t, "gzip", get(h, http.MethodGet, "/assets/index-B80ZTyZ2.js", map[string]string{"Accept-Encoding": "GZIP;q=0.5"}).Header().Get("Content-Encoding"))
	assert.Empty(t, get(h, http.MethodGet, "/og.png", map[string]string{"Accept-Encoding": "gzip"}).Header().Get("Content-Encoding"), "images aren't recompressed")
	assert.Empty(t, get(h, http.MethodGet, "/version", map[string]string{"Accept-Encoding": "gzip"}).Header().Get("Content-Encoding"), "tiny files aren't worth it")
}

func TestHeadScriptIsAddedToIndexOnly(t *testing.T) {
	t.Parallel()

	plain := testHandler(t)
	h := testHandlerWith(t, testIndex, func(string) (string, error) {
		return "<script>window.X = 1;</script>", nil
	})

	for _, target := range []string{"/", "/u/ash/living-dex"} {
		w := get(h, http.MethodGet, target, nil)
		assert.True(t, strings.HasPrefix(w.Body.String(), "<html><head><script>window.X = 1;</script></head>app</html>"), target)
	}
	assert.NotEqual(t, get(plain, http.MethodGet, "/", nil).Header().Get("ETag"), get(h, http.MethodGet, "/", nil).Header().Get("ETag"), "the ETag covers the added script")
	assert.NotContains(t, get(h, http.MethodGet, "/assets/index-B80ZTyZ2.js", nil).Body.String(), "window.X")
}

func TestHeadScriptNeedsAHead(t *testing.T) {
	t.Parallel()

	_, _, err := newHandler(fstest.MapFS{"index.html": {Data: []byte("<html>no head</html>")}}, func(string) (string, error) {
		return "<script></script>", nil
	}, nil)

	assert.Error(t, err)
}

func TestVersionIsTheBuildID(t *testing.T) {
	t.Parallel()

	var given string
	h := testHandlerWith(t, testIndex, func(build string) (string, error) {
		given = build
		return "<script>window.X = 1;</script>", nil
	})

	w := get(h, http.MethodGet, "/version", nil)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, given, w.Body.String(), "the page and /version agree on the build")
	assert.Regexp(t, `^[0-9a-f]{16}$`, given)
	assert.Contains(t, w.Header().Get("Content-Type"), "text/plain")
}

func TestBuildIDFollowsTheCode(t *testing.T) {
	t.Parallel()

	version := func(index string, script string) string {
		h := testHandlerWith(t, index, func(string) (string, error) { return script, nil })
		return get(h, http.MethodGet, "/version", nil).Body.String()
	}

	first := version(testIndex, "<script>window.X = 1;</script>")
	assert.Equal(t, first, version(testIndex, "<script>window.X = 2;</script>"), "a new config (like a new deploy's version) isn't a new build")
	assert.NotEqual(t, first, version(`<html><head><script src="/assets/index-C9aYzX1q.js"></script></head>app</html>`, ""), "new code is a new build")
}

func TestHeadScriptErrorsStopTheHandler(t *testing.T) {
	t.Parallel()

	_, _, err := newHandler(fstest.MapFS{"index.html": {Data: []byte(testIndex)}}, func(string) (string, error) {
		return "", errors.New("broken")
	}, nil)

	assert.Error(t, err)
}

const pagedIndex = "<html><head><!-- page --><title>Home</title><!-- /page --><script>config</script></head>app</html>"

func pagedHandler(t *testing.T, page PageFunc) http.Handler {
	t.Helper()
	h, ok, err := newHandler(fstest.MapFS{
		"index.html":                {Data: []byte(pagedIndex + strings.Repeat(" ", 2048))},
		"favicon/favicon-16x16.png": {Data: []byte("icon")},
	}, nil, page)
	require.NoError(t, err)
	require.True(t, ok)
	return h
}

func TestPagesReplaceThePageBlock(t *testing.T) {
	t.Parallel()

	var paths []string
	h := pagedHandler(t, func(r *http.Request) Page {
		paths = append(paths, r.URL.Path)
		return Page{Head: "<title>" + r.URL.Path + "</title>"}
	})

	w := get(h, http.MethodGet, "/u/ash", nil)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, strings.HasPrefix(w.Body.String(), "<html><head><title>/u/ash</title><script>config</script></head>app</html>"), w.Body.String())
	assert.Equal(t, "no-cache", w.Header().Get("Cache-Control"))
	assert.Contains(t, w.Header().Get("Content-Type"), "text/html")
	etag := w.Header().Get("ETag")
	assert.NotEmpty(t, etag)

	w = get(h, http.MethodGet, "/u/ash", map[string]string{"If-None-Match": etag})
	assert.Equal(t, http.StatusNotModified, w.Code, "the same page revalidates")

	w = get(h, http.MethodGet, "/u/misty", map[string]string{"If-None-Match": etag})
	assert.Equal(t, http.StatusOK, w.Code, "another page's ETag doesn't match")

	w = get(h, http.MethodGet, "/favicon/favicon-16x16.png", nil)
	assert.Equal(t, "icon", w.Body.String())
	assert.Equal(t, []string{"/u/ash", "/u/ash", "/u/misty"}, paths, "files other than index.html aren't pages")
}

func TestPagesSetTheStatus(t *testing.T) {
	t.Parallel()

	h := pagedHandler(t, func(*http.Request) Page {
		return Page{Status: http.StatusNotFound, Head: "<title>404</title>"}
	})

	w := get(h, http.MethodGet, "/u/nobody", nil)
	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.True(t, strings.HasPrefix(w.Body.String(), "<html><head><title>404</title>"), "a missing page still gets the app, to show its not found page")
	assert.Empty(t, w.Header().Get("ETag"))

	w = get(h, http.MethodHead, "/u/nobody", nil)
	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Empty(t, w.Body.String())

	w = get(h, http.MethodGet, "/u/nobody", map[string]string{"Accept-Encoding": "gzip"})
	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "gzip", w.Header().Get("Content-Encoding"))
	assert.Equal(t, strconv.Itoa(w.Body.Len()), w.Header().Get("Content-Length"))
	reader, err := gzip.NewReader(w.Body)
	require.NoError(t, err)
	body, err := io.ReadAll(reader)
	require.NoError(t, err)
	assert.True(t, strings.HasPrefix(string(body), "<html><head><title>404</title>"))
}

func TestPagesNeedAPageBlock(t *testing.T) {
	t.Parallel()

	_, _, err := newHandler(fstest.MapFS{"index.html": {Data: []byte(testIndex)}}, nil, func(*http.Request) Page { return Page{} })

	assert.Error(t, err)
}
