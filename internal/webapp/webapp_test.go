package webapp

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testHandler(t *testing.T) http.Handler {
	t.Helper()
	h, err := newHandler(fstest.MapFS{
		".gitkeep":                         {},
		"index.html":                       {Data: []byte("<html>app</html>")},
		"version":                          {Data: []byte("Sat Oct 17 2026\n")},
		"main.0123456789abcdef0123.js":     {Data: []byte("console.log(1)")},
		"main.0123456789abcdef0123.js.map": {Data: []byte("{}")},
		"pokesprite-v12.png":               {Data: []byte("png")},
		"favicon/favicon-16x16.png":        {Data: []byte("icon")},
	})
	require.NoError(t, err)
	require.NotNil(t, h)
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

	assert.Equal(t, "<html>app</html>", w.Body.String())
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

	w := get(h, http.MethodGet, "/../../go.mod", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestNoBuildMeansNoHandler(t *testing.T) {
	h, err := newHandler(fstest.MapFS{".gitkeep": {}})

	require.NoError(t, err)
	assert.Nil(t, h)
}
