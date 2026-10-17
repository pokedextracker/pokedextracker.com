package server

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-pg/pg/v10"
	"github.com/pokedextracker/pokedextracker.com/pkg/config"
	"github.com/pokedextracker/pokedextracker.com/pkg/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeFrontend stands in for the embedded build.
var fakeFrontend = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = io.WriteString(w, "frontend "+r.URL.Path+" "+strings.Repeat("x", 2048))
})

func serve(t *testing.T, h http.Handler, method, target string, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, target, nil)
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	return w
}

// testServer builds a server whose routes are exercised without touching the
// database, so it uses a lazy connection that never dials.
func testServer(t *testing.T, cfg *config.Config) http.Handler {
	t.Helper()
	db := pg.Connect(&pg.Options{Addr: "127.0.0.1:1"})
	t.Cleanup(func() { _ = db.Close() })
	srv, err := newServer(cfg, db, fakeFrontend)
	require.NoError(t, err)
	return srv.Handler
}

func TestNew(t *testing.T) {
	cfg, err := config.New()
	require.NoError(t, err)
	db, err := database.New("server test", cfg)
	require.NoError(t, err)
	srv, err := New(cfg, db)
	require.NoError(t, err)

	w := serve(t, srv.Handler, http.MethodGet, "/health", nil)
	assert.Equal(t, http.StatusOK, w.Code, "incorrect status code")
	assert.Equal(t, `{"healthy":true}`, w.Body.String(), "incorrect response")

	// The API answers under /api, and at the root until the cutover.
	for _, target := range []string{"/api/games", "/games"} {
		w = serve(t, srv.Handler, http.MethodGet, target, nil)
		assert.Equal(t, http.StatusOK, w.Code, target)
		assert.True(t, strings.HasPrefix(w.Body.String(), "["), target)
	}
	assert.Equal(t, "no-store", serve(t, srv.Handler, http.MethodGet, "/api/games", nil).Header().Get("Cache-Control"))
}

func TestAPIHealthAndNotFound(t *testing.T) {
	h := testServer(t, &config.Config{})

	assert.Equal(t, `{"healthy":true}`, serve(t, h, http.MethodGet, "/api/health", nil).Body.String())

	for _, target := range []string{"/api", "/api/nope", "/api/u/ash"} {
		w := serve(t, h, http.MethodGet, target, nil)
		assert.Equal(t, http.StatusNotFound, w.Code, target)
		assert.Contains(t, w.Body.String(), "page not found", "unknown API paths are JSON, not the frontend: "+target)
	}
}

func TestFrontendServesEverythingElse(t *testing.T) {
	h := testServer(t, &config.Config{})

	for _, target := range []string{"/", "/u/ash/living-dex", "/register"} {
		w := serve(t, h, http.MethodGet, target, nil)
		assert.Equal(t, http.StatusOK, w.Code, target)
		assert.Contains(t, w.Body.String(), "frontend "+target, target)
	}
	assert.Equal(t, http.StatusOK, serve(t, h, http.MethodHead, "/", nil).Code)
}

func TestWithoutAFrontendUnknownPathsAreNotFound(t *testing.T) {
	db := pg.Connect(&pg.Options{Addr: "127.0.0.1:1"})
	defer func() { _ = db.Close() }()
	srv, err := newServer(&config.Config{}, db, nil)
	require.NoError(t, err)

	w := serve(t, srv.Handler, http.MethodGet, "/foo", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "page not found")
}

func TestGzip(t *testing.T) {
	h := testServer(t, &config.Config{})

	w := serve(t, h, http.MethodGet, "/u/ash", map[string]string{"Accept-Encoding": "gzip"})
	assert.Equal(t, "gzip", w.Header().Get("Content-Encoding"))

	w = serve(t, h, http.MethodGet, "/pokesprite-v12.png", map[string]string{"Accept-Encoding": "gzip"})
	assert.Empty(t, w.Header().Get("Content-Encoding"), "images are already compressed")
}

func TestWWWRedirect(t *testing.T) {
	h := testServer(t, &config.Config{})

	for host, want := range map[string]string{
		"www.pokedextracker.com":         "https://pokedextracker.com/u/ash?x=1",
		"www.staging.pokedextracker.com": "https://staging.pokedextracker.com/u/ash?x=1",
		"www.localhost:8647":             "https://localhost/u/ash?x=1",
	} {
		req := httptest.NewRequest(http.MethodGet, "/u/ash?x=1", nil)
		req.Host = host
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
		assert.Equal(t, http.StatusMovedPermanently, w.Code, host)
		assert.Equal(t, want, w.Header().Get("Location"), host)
	}

	req := httptest.NewRequest(http.MethodGet, "/u/ash", nil)
	req.Host = "pokedextracker.com"
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code, "the bare domain isn't redirected")
}

func TestBlogProxy(t *testing.T) {
	var seenHost, seenPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenHost, seenPath = r.Host, r.URL.RequestURI()
		w.Header().Set("Cache-Control", "public, max-age=0")
		_, _ = io.WriteString(w, "ghost")
	}))
	defer upstream.Close()

	h := testServer(t, &config.Config{BlogURL: upstream.URL})

	w := serve(t, h, http.MethodGet, "/blog/some-post/?ref=1", map[string]string{"Accept-Encoding": "gzip"})

	assert.Equal(t, "ghost", w.Body.String(), "the blog's response isn't re-compressed")
	assert.Equal(t, "public, max-age=0", w.Header().Get("Cache-Control"), "the blog's own headers pass through")
	assert.Equal(t, "/blog/some-post/?ref=1", seenPath, "the path is passed through unchanged")
	assert.Equal(t, strings.TrimPrefix(upstream.URL, "http://"), seenHost, "the upstream sees its own host name")

	serve(t, h, http.MethodGet, "/blog", nil)
	assert.Equal(t, "/blog", seenPath)
}

func TestNoBlogFallsThroughToTheFrontend(t *testing.T) {
	h := testServer(t, &config.Config{})

	w := serve(t, h, http.MethodGet, "/blog/", nil)

	assert.Contains(t, w.Body.String(), "frontend /blog/", "staging has no blog, like today")
}
