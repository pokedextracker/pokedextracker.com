package server

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v4"
	"github.com/pokedextracker/pokedextracker.com/pkg/config"
	"github.com/pokedextracker/pokedextracker.com/pkg/database"
	"github.com/robinjoseph08/golib/echo/v4/middleware/recovery"
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
	t.Parallel()

	cfg, err := config.New()
	require.NoError(t, err)
	db, err := database.New("server test", cfg)
	require.NoError(t, err)
	srv, err := New(cfg, db)
	require.NoError(t, err)

	w := serve(t, srv.Handler, http.MethodGet, "/health", nil)
	assert.Equal(t, http.StatusOK, w.Code, "incorrect status code")
	assert.Equal(t, `{"healthy":true}`, w.Body.String(), "incorrect response")

	w = serve(t, srv.Handler, http.MethodGet, "/api/games", nil)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, strings.HasPrefix(w.Body.String(), "["))
	assert.Equal(t, "no-store", w.Header().Get("Cache-Control"))
}

func TestAPIHealthAndNotFound(t *testing.T) {
	t.Parallel()

	h := testServer(t, &config.Config{})

	assert.Equal(t, `{"healthy":true}`, serve(t, h, http.MethodGet, "/api/health", nil).Body.String())

	for _, target := range []string{"/api", "/api/nope", "/api/u/ash"} {
		w := serve(t, h, http.MethodGet, target, nil)
		assert.Equal(t, http.StatusNotFound, w.Code, target)
		assert.Contains(t, w.Body.String(), "page not found", "unknown API paths are JSON, not the frontend: "+target)
	}
}

func TestFrontendServesEverythingElse(t *testing.T) {
	t.Parallel()

	h := testServer(t, &config.Config{})

	// The API only answers under /api, so its paths at the root are frontend
	// routes too.
	for _, target := range []string{"/", "/u/ash/living-dex", "/register", "/games"} {
		w := serve(t, h, http.MethodGet, target, nil)
		assert.Equal(t, http.StatusOK, w.Code, target)
		assert.Contains(t, w.Body.String(), "frontend "+target, target)
	}
	assert.Equal(t, http.StatusOK, serve(t, h, http.MethodHead, "/", nil).Code)
}

func TestWithoutAFrontendUnknownPathsAreNotFound(t *testing.T) {
	t.Parallel()

	db := pg.Connect(&pg.Options{Addr: "127.0.0.1:1"})
	t.Cleanup(func() { _ = db.Close() })
	srv, err := newServer(&config.Config{}, db, nil)
	require.NoError(t, err)

	w := serve(t, srv.Handler, http.MethodGet, "/foo", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "page not found")
}

func TestGzipIsOnlyForTheAPI(t *testing.T) {
	t.Parallel()

	h := testServer(t, &config.Config{})

	w := serve(t, h, http.MethodGet, "/api/health", map[string]string{"Accept-Encoding": "gzip"})
	assert.Equal(t, "gzip", w.Header().Get("Content-Encoding"))

	w = serve(t, h, http.MethodGet, "/u/ash", map[string]string{"Accept-Encoding": "gzip"})
	assert.Empty(t, w.Header().Get("Content-Encoding"), "the frontend handler compresses its own files")
}

func TestHeadHealth(t *testing.T) {
	t.Parallel()

	h := testServer(t, &config.Config{})

	for _, target := range []string{"/health", "/api/health"} {
		w := serve(t, h, http.MethodHead, target, nil)
		assert.Equal(t, http.StatusOK, w.Code, target)
		assert.Contains(t, w.Header().Get("Content-Type"), "application/json", target)
	}
}

func TestWWWRedirect(t *testing.T) {
	t.Parallel()

	h := testServer(t, &config.Config{})

	for host, want := range map[string]string{
		"www.pokedextracker.com":         "https://pokedextracker.com/u/ash?x=1",
		"WWW.PokedexTracker.com":         "https://pokedextracker.com/u/ash?x=1",
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

	// An absolute-form request target redirects to the same path.
	req := httptest.NewRequest(http.MethodGet, "http://www.pokedextracker.com/u/ash?x=1", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	assert.Equal(t, "https://pokedextracker.com/u/ash?x=1", w.Header().Get("Location"))

	req = httptest.NewRequest(http.MethodGet, "/u/ash", nil)
	req.Host = "pokedextracker.com"
	w = httptest.NewRecorder()
	h.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code, "the bare domain isn't redirected")
}

func TestBlogProxy(t *testing.T) {
	t.Parallel()

	var seenHost, seenPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenHost, seenPath = r.Host, r.URL.RequestURI()
		w.Header().Set("Cache-Control", "public, max-age=0")
		_, _ = io.WriteString(w, "ghost")
	}))
	t.Cleanup(upstream.Close)

	h := testServer(t, &config.Config{BlogURL: upstream.URL})

	w := serve(t, h, http.MethodGet, "/blog/some-post/?ref=1", map[string]string{"Accept-Encoding": "gzip"})

	assert.Equal(t, "ghost", w.Body.String(), "the blog's response isn't re-compressed")
	assert.Equal(t, "public, max-age=0", w.Header().Get("Cache-Control"), "the blog's own headers pass through")
	assert.Equal(t, "/blog/some-post/?ref=1", seenPath, "the path is passed through unchanged")
	assert.Equal(t, strings.TrimPrefix(upstream.URL, "http://"), seenHost, "the upstream sees its own host name")

	serve(t, h, http.MethodGet, "/blog", nil)
	assert.Equal(t, "/blog", seenPath)
}

func TestUnreachableBlogIsABadGateway(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.NotFoundHandler())
	address := upstream.URL
	upstream.Close()

	h := testServer(t, &config.Config{BlogURL: address})

	assert.Equal(t, http.StatusBadGateway, serve(t, h, http.MethodGet, "/blog/", nil).Code)
}

// blogServer runs the blog proxy behind the recovery middleware, recording
// errors that reach Echo's error handler, which is what reports 500s.
func blogServer(t *testing.T, upstream string) (*httptest.Server, func() []error) {
	t.Helper()
	blog, err := blogProxy(upstream)
	require.NoError(t, err)
	e := echo.New()
	e.Use(recovery.Middleware())
	var mutex sync.Mutex
	var reported []error
	e.HTTPErrorHandler = func(err error, _ echo.Context) {
		mutex.Lock()
		defer mutex.Unlock()
		reported = append(reported, err)
	}
	e.Any("/blog/*", blog)
	srv := httptest.NewServer(e)
	t.Cleanup(srv.Close)
	return srv, func() []error {
		mutex.Lock()
		defer mutex.Unlock()
		return append([]error{}, reported...)
	}
}

func TestBlogVisitorsLeavingMidResponseAreNotErrors(t *testing.T) {
	t.Parallel()

	// The upstream streams slowly until the visitor goes away.
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		for i := 0; i < 100 && r.Context().Err() == nil; i++ {
			_, _ = io.WriteString(w, strings.Repeat("x", 1024))
			w.(http.Flusher).Flush()
			time.Sleep(10 * time.Millisecond)
		}
	}))
	t.Cleanup(upstream.Close)
	srv, reported := blogServer(t, upstream.URL)

	ctx, cancel := context.WithCancel(context.Background())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL+"/blog/post/", nil)
	require.NoError(t, err)
	response, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	_, _ = response.Body.Read(make([]byte, 512))
	cancel()
	_ = response.Body.Close()
	time.Sleep(300 * time.Millisecond)

	assert.Empty(t, reported(), "a visitor leaving a blog page isn't reported as an error")
}

func TestBlogSeesItsOwnHostAndTheForwardingHeaders(t *testing.T) {
	t.Parallel()

	var seen *http.Request
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = r.Clone(r.Context())
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(upstream.Close)
	srv, _ := blogServer(t, upstream.URL)

	request, err := http.NewRequestWithContext(t.Context(), http.MethodGet, srv.URL+"/blog/post/?page=2", nil)
	require.NoError(t, err)
	request.Header.Set("X-Forwarded-For", "203.0.113.7")
	request.Header.Set("X-Forwarded-Proto", "https")
	request.Header.Set("X-Forwarded-Host", "pokedextracker.com")
	response, err := http.DefaultClient.Do(request)
	require.NoError(t, err)
	_ = response.Body.Close()

	require.NotNil(t, seen)
	assert.Equal(t, strings.TrimPrefix(upstream.URL, "http://"), seen.Host)
	assert.Equal(t, "/blog/post/?page=2", seen.URL.RequestURI())
	assert.Equal(t, "203.0.113.7, 127.0.0.1", seen.Header.Get("X-Forwarded-For"))
	assert.Equal(t, "https", seen.Header.Get("X-Forwarded-Proto"))
	assert.Equal(t, "pokedextracker.com", seen.Header.Get("X-Forwarded-Host"))
}

func TestClientIPIsTheOneFlySees(t *testing.T) {
	t.Parallel()

	extract := clientIP()
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.RemoteAddr = "172.16.45.18:51234"
	// What Fly sends: the visitor's address, and X-Forwarded-For ending in the
	// app's own address.
	request.Header.Set("Fly-Client-Ip", "107.131.100.242")
	request.Header.Set("X-Forwarded-For", "107.131.100.242, 66.241.124.130")

	assert.Equal(t, "107.131.100.242", extract(request))

	request.Header.Set("Fly-Client-IP", "2001:db8::1")
	assert.Equal(t, "2001:db8::1", extract(request), "an IPv6 visitor's address")

	request.Header.Set("Fly-Client-IP", "not an address")
	assert.Equal(t, "172.16.45.18", extract(request), "a header that isn't an address is ignored")

	request.Header.Del("Fly-Client-IP")
	assert.Equal(t, "172.16.45.18", extract(request), "without the header, like in development, it's the connection's")
}

func TestBlogURLPathIsNotJoinedOn(t *testing.T) {
	t.Parallel()

	var seen string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = r.URL.RequestURI()
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(upstream.Close)
	srv, _ := blogServer(t, upstream.URL+"/ghost")

	response, err := http.Get(srv.URL + "/blog/post/")
	require.NoError(t, err)
	_ = response.Body.Close()

	assert.Equal(t, "/blog/post/", seen)
}

func TestBlogUpstreamBreakingMidResponseIsReported(t *testing.T) {
	t.Parallel()

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Length", "100000")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, "partial")
		w.(http.Flusher).Flush()
		panic(http.ErrAbortHandler)
	}))
	t.Cleanup(upstream.Close)
	srv, reported := blogServer(t, upstream.URL)

	response, err := http.Get(srv.URL + "/blog/post/")
	if err == nil {
		_, _ = io.ReadAll(response.Body)
		_ = response.Body.Close()
	}
	time.Sleep(100 * time.Millisecond)

	assert.NotEmpty(t, reported(), "a broken upstream is still reported")
}

func TestNoBlogFallsThroughToTheFrontend(t *testing.T) {
	t.Parallel()

	h := testServer(t, &config.Config{})

	w := serve(t, h, http.MethodGet, "/blog/", nil)

	assert.Contains(t, w.Body.String(), "frontend /blog/", "staging has no blog, like today")
}

func TestFrontendConfigScript(t *testing.T) {
	t.Parallel()

	script, err := frontendConfigScript(&config.Config{
		Environment:        "production",
		RollbarClientToken: "token</script><script>alert(1)",
		Version:            "abc1234",
	})
	require.NoError(t, err)

	assert.True(t, strings.HasPrefix(script, "<script>window.POKEDEXTRACKER_CONFIG = {"))
	assert.Contains(t, script, `"environment":"production"`)
	assert.Contains(t, script, `"version":"abc1234"`)
	assert.Equal(t, 1, strings.Count(script, "</script>"), "values can't close the script tag")

	script, err = frontendConfigScript(&config.Config{Environment: "development"})
	require.NoError(t, err)
	assert.Contains(t, script, `"version":"unknown"`)
}

//nolint:paralleltest // It sets environment variables, which t.Parallel() doesn't allow.
func TestEnvironmentsGetTheirOwnFrontendConfig(t *testing.T) {
	for _, env := range []string{"development", "staging", "production"} {
		t.Setenv("ENVIRONMENT", env)
		cfg, err := config.New()
		require.NoError(t, err)
		script, err := frontendConfigScript(cfg)
		require.NoError(t, err)
		assert.Contains(t, script, `"environment":"`+env+`"`, env)
		assert.Contains(t, script, `"rollbarToken":"19ffd96c890b422287ce3a06a917678e"`, env)
	}
}
