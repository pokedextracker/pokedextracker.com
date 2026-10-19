package server

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/go-pg/pg/v10"
	"github.com/pokedextracker/pokedextracker.com/pkg/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// upstreamRequest is what a fake Umami saw.
type upstreamRequest struct {
	method       string
	path         string
	host         string
	flyClientIP  string
	userAgent    string
	forwardedFor string
	contentType  string
	cookie       string
	auth         string
	body         string
}

// fakeUmami records every request and answers like Umami does.
func fakeUmami(t *testing.T) (*httptest.Server, func() []upstreamRequest) {
	t.Helper()
	var mu sync.Mutex
	var seen []upstreamRequest
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		seen = append(seen, upstreamRequest{
			method:       r.Method,
			path:         r.URL.Path,
			host:         r.Host,
			flyClientIP:  r.Header.Get("Fly-Client-IP"),
			userAgent:    r.Header.Get("User-Agent"),
			forwardedFor: r.Header.Get("X-Forwarded-For"),
			contentType:  r.Header.Get("Content-Type"),
			cookie:       r.Header.Get("Cookie"),
			auth:         r.Header.Get("Authorization"),
			body:         string(body),
		})
		mu.Unlock()
		switch r.URL.Path {
		case "/script.js":
			if r.Header.Get("If-None-Match") == `"v1"` {
				w.WriteHeader(http.StatusNotModified)
				return
			}
			w.Header().Set("ETag", `"v1"`)
			w.Header().Set("Content-Type", "application/javascript")
			w.Header().Set("Cache-Control", "public, max-age=86400")
			_, _ = io.WriteString(w, "/* tracker */")
		case "/api/send":
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, `{"cache":"abc","sessionId":"s1","visitId":"v1"}`)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(upstream.Close)
	return upstream, func() []upstreamRequest {
		mu.Lock()
		defer mu.Unlock()
		return append([]upstreamRequest(nil), seen...)
	}
}

func analyticsServer(t *testing.T, umamiURL string) http.Handler {
	t.Helper()
	return testServer(t, &config.Config{UmamiURL: umamiURL, UmamiWebsiteID: "site-1"})
}

func TestAnalyticsForwardsTheScript(t *testing.T) {
	upstream, seen := fakeUmami(t)
	h := analyticsServer(t, upstream.URL)

	w := serve(t, h, http.MethodGet, "/stats/script.js", map[string]string{
		"Fly-Client-IP": "203.0.113.7",
		"User-Agent":    "Mozilla/5.0 (test)",
	})

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "/* tracker */", w.Body.String())
	assert.Equal(t, "public, max-age=3600", w.Header().Get("Cache-Control"), "kept for an hour, whatever Umami says")
	require.Len(t, seen(), 1)
	got := seen()[0]
	assert.Equal(t, "/script.js", got.path, "the /stats prefix is stripped")
	assert.Equal(t, strings.TrimPrefix(upstream.URL, "http://"), got.host, "Umami sees its own host name, not the site's")
	assert.Equal(t, "203.0.113.7", got.flyClientIP)
	assert.Equal(t, "Mozilla/5.0 (test)", got.userAgent)
}

func TestAnalyticsForwardsEvents(t *testing.T) {
	upstream, seen := fakeUmami(t)
	h := analyticsServer(t, upstream.URL)
	payload := `{"type":"event","payload":{"website":"site-1","url":"/u/ash"}}`

	req := httptest.NewRequest(http.MethodPost, "/stats/api/send", strings.NewReader(payload))
	req.Host = "pokedextracker.com"
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Fly-Client-IP", "198.51.100.4")
	req.Header.Set("User-Agent", "Mozilla/5.0 (test)")
	req.Header.Set("Cookie", "ghost-members-ssr=secret")
	req.Header.Set("Authorization", "Bearer secret")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.JSONEq(t, `{"cache":"abc","sessionId":"s1","visitId":"v1"}`, w.Body.String(), "Umami's answer goes back unchanged")
	assert.Equal(t, "no-store", w.Header().Get("Cache-Control"))
	require.Len(t, seen(), 1)
	got := seen()[0]
	assert.Equal(t, http.MethodPost, got.method)
	assert.Equal(t, "/api/send", got.path)
	assert.Equal(t, strings.TrimPrefix(upstream.URL, "http://"), got.host)
	assert.Equal(t, "198.51.100.4", got.flyClientIP)
	assert.Equal(t, "Mozilla/5.0 (test)", got.userAgent)
	assert.Equal(t, "application/json", got.contentType)
	assert.Equal(t, payload, got.body)
	assert.Empty(t, got.forwardedFor, "Umami reads Fly-Client-IP; nothing else claims to be the visitor")
	assert.Empty(t, got.cookie, "the site's cookies stay here")
	assert.Empty(t, got.auth, "the site's credentials stay here")
}

func TestAnalyticsScriptRevalidationKeepsItsCaching(t *testing.T) {
	upstream, _ := fakeUmami(t)
	h := analyticsServer(t, upstream.URL)

	w := serve(t, h, http.MethodGet, "/stats/script.js", map[string]string{"If-None-Match": `"v1"`})

	assert.Equal(t, http.StatusNotModified, w.Code)
	assert.Equal(t, "public, max-age=3600", w.Header().Get("Cache-Control"))
}

func TestAnalyticsOnlyForwardsTheTwoRoutes(t *testing.T) {
	upstream, seen := fakeUmami(t)
	h := analyticsServer(t, upstream.URL)

	for _, request := range []struct{ method, target string }{
		{http.MethodGet, "/stats"},
		{http.MethodGet, "/stats/"},
		{http.MethodGet, "/stats/api/websites"},
		{http.MethodGet, "/stats/api/send"},
		{http.MethodPost, "/stats/script.js"},
		{http.MethodGet, "/stats/login"},
		{http.MethodGet, "/stats/../api/games"},
	} {
		w := serve(t, h, request.method, request.target, nil)
		assert.Contains(t, []int{http.StatusNotFound, http.StatusMethodNotAllowed}, w.Code, request.method+" "+request.target)
		assert.NotContains(t, w.Body.String(), "frontend", request.method+" "+request.target)
	}
	assert.Empty(t, seen(), "nothing else reaches Umami")
}

func TestAnalyticsRejectsLargeEvents(t *testing.T) {
	upstream, seen := fakeUmami(t)
	h := analyticsServer(t, upstream.URL)

	req := httptest.NewRequest(http.MethodPost, "/stats/api/send", strings.NewReader(strings.Repeat("x", analyticsMaxBody+1)))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
	assert.Empty(t, seen(), "the oversized body never reaches Umami")
}

func TestUnreachableAnalyticsIsABadGateway(t *testing.T) {
	upstream := httptest.NewServer(http.NotFoundHandler())
	upstream.Close()
	h := analyticsServer(t, upstream.URL)

	w := serve(t, h, http.MethodGet, "/stats/script.js", nil)

	assert.Equal(t, http.StatusBadGateway, w.Code)
	assert.Equal(t, "no-store", w.Header().Get("Cache-Control"))
}

func TestAnalyticsAreOffWithoutBothSettings(t *testing.T) {
	upstream, seen := fakeUmami(t)

	for _, cfg := range []*config.Config{
		{},
		{UmamiURL: upstream.URL},
		{UmamiWebsiteID: "site-1"},
	} {
		h := testServer(t, cfg)
		w := serve(t, h, http.MethodGet, "/stats/script.js", nil)
		assert.Contains(t, w.Body.String(), "frontend /stats/script.js", "the frontend handles it, which 404s a missing file")
		assert.Empty(t, analyticsScript(cfg))
	}
	assert.Empty(t, seen())
}

func TestAnalyticsScript(t *testing.T) {
	script := analyticsScript(&config.Config{UmamiURL: "https://umami.example.com", UmamiWebsiteID: `id"><script>alert(1)</script>`})

	assert.True(t, strings.HasPrefix(script, `<script async src="/stats/script.js" data-website-id="`), "async, so a slow Umami can't hold up the app")
	assert.Equal(t, 1, strings.Count(script, "<script"), "the website ID can't add a tag")
	assert.NotContains(t, script, "umami.example.com", "Umami's address stays out of the page")
}

func TestInvalidUmamiURL(t *testing.T) {
	db := pg.Connect(&pg.Options{Addr: "127.0.0.1:1"})
	t.Cleanup(func() { _ = db.Close() })
	for _, raw := range []string{"umami.example.com", "://nope", "/relative"} {
		_, err := newServer(&config.Config{UmamiURL: raw, UmamiWebsiteID: "site-1"}, db, fakeFrontend)
		assert.Error(t, err, raw)
	}
}

func TestAnalyticsAreTaggedWithTheVersion(t *testing.T) {
	cfg := &config.Config{UmamiURL: "https://umami.example.com", UmamiWebsiteID: "site-1", Version: "08730e5"}
	assert.Equal(t, `<script async src="/stats/script.js" data-website-id="site-1" data-tag="08730e5"></script>`, analyticsScript(cfg))

	cfg.Version = ""
	assert.NotContains(t, analyticsScript(cfg), "data-tag", "a build without a version isn't tagged")

	cfg.Version = `v"><script>alert(1)</script>`
	assert.Equal(t, 1, strings.Count(analyticsScript(cfg), "<script"), "the version can't add a tag")
}
