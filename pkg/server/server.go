package server

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/labstack/gommon/log"
	"github.com/pkg/errors"
	"github.com/pokedextracker/pokedextracker.com/internal/webapp"
	"github.com/pokedextracker/pokedextracker.com/pkg/auth"
	"github.com/pokedextracker/pokedextracker.com/pkg/binder"
	"github.com/pokedextracker/pokedextracker.com/pkg/captures"
	"github.com/pokedextracker/pokedextracker.com/pkg/config"
	"github.com/pokedextracker/pokedextracker.com/pkg/dexes"
	"github.com/pokedextracker/pokedextracker.com/pkg/dextypes"
	"github.com/pokedextracker/pokedextracker.com/pkg/errcodes"
	"github.com/pokedextracker/pokedextracker.com/pkg/games"
	"github.com/pokedextracker/pokedextracker.com/pkg/pokemon"
	"github.com/pokedextracker/pokedextracker.com/pkg/users"
	"github.com/robinjoseph08/golib/echo/v4/middleware/logger"
	"github.com/robinjoseph08/golib/echo/v4/middleware/recovery"
	glogger "github.com/robinjoseph08/golib/logger"
)

var healthResponse = []byte(`{"healthy":true}`)

// New builds the server for the whole site: the API under /api, the /blog and
// /stats proxies, and the embedded frontend for everything else.
func New(cfg *config.Config, db *pg.DB) (*http.Server, error) {
	script, err := frontendConfigScript(cfg)
	if err != nil {
		return nil, err
	}
	frontend, ok, err := webapp.Handler(script + analyticsScript(cfg))
	if err != nil {
		return nil, errors.WithStack(err)
	}
	if !ok {
		frontend = nil
	}
	return newServer(cfg, db, frontend)
}

func newServer(cfg *config.Config, db *pg.DB, frontend http.Handler) (*http.Server, error) {
	e := echo.New()

	e.Logger.SetLevel(log.OFF)
	e.IPExtractor = clientIP()

	b, err := binder.New()
	if err != nil {
		return nil, errors.WithStack(err)
	}
	e.Binder = b

	e.Pre(redirectWWW)
	e.Use(logger.Middleware())
	e.Use(recovery.Middleware())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: cfg.CORSAllowedOrigins,
	}))
	// The frontend handler compresses its own files once, and the blog's
	// upstream compresses its own responses, so only the API is gzipped here.
	e.Use(middleware.GzipWithConfig(middleware.GzipConfig{Skipper: func(c echo.Context) bool {
		return !strings.HasPrefix(c.Request().URL.Path, "/api/")
	}}))

	e.GET("/health", health)
	e.HEAD("/health", health)

	api := e.Group("/api", noStore)
	api.GET("/health", health)
	api.HEAD("/health", health)
	registerAPI(api, cfg, db)
	// Unknown API paths are a JSON 404, never the frontend.
	api.Any("", notFoundHandler)
	api.Any("/*", notFoundHandler)

	if cfg.BlogURL != "" {
		blog, err := blogProxy(cfg.BlogURL)
		if err != nil {
			return nil, err
		}
		e.Any("/blog", blog)
		e.Any("/blog/*", blog)
	}

	if analyticsEnabled(cfg) {
		if err := registerAnalytics(e, cfg.UmamiURL); err != nil {
			return nil, err
		}
	}

	if frontend != nil {
		e.GET("/*", echo.WrapHandler(frontend))
		e.HEAD("/*", echo.WrapHandler(frontend))
	}

	echo.NotFoundHandler = notFoundHandler
	e.HTTPErrorHandler = errcodes.NewHandler().Handle

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           e,
		ReadHeaderTimeout: 2 * time.Second,
	}

	return srv, nil
}

// frontendConfig is what the frontend reads from window.POKEDEXTRACKER_CONFIG
// (config/index.ts). It comes from the server so the same build reports the
// right environment wherever it runs, without guessing from the hostname.
type frontendConfig struct {
	Environment  string `json:"environment"`
	RollbarToken string `json:"rollbarToken"`
	Version      string `json:"version"`
}

func frontendConfigScript(cfg *config.Config) (string, error) {
	version := cfg.Version
	if version == "" {
		version = "unknown"
	}
	// json.Marshal escapes <, >, and &, so the values can't close the script.
	value, err := json.Marshal(frontendConfig{
		Environment:  cfg.Environment,
		RollbarToken: cfg.RollbarClientToken,
		Version:      version,
	})
	if err != nil {
		return "", errors.WithStack(err)
	}
	return "<script>window.POKEDEXTRACKER_CONFIG = " + string(value) + ";</script>", nil
}

func registerAPI(g *echo.Group, cfg *config.Config, db *pg.DB) {
	enforcedAuth, nonEnforcedAuth := auth.Middleware(cfg, db)

	auth.RegisterRoutes(g, cfg, db, nonEnforcedAuth)
	captures.RegisterRoutes(g, db, enforcedAuth, nonEnforcedAuth)
	dexes.RegisterRoutes(g, db, enforcedAuth, nonEnforcedAuth)
	dextypes.RegisterRoutes(g, db, nonEnforcedAuth)
	games.RegisterRoutes(g, db, nonEnforcedAuth)
	pokemon.RegisterRoutes(g, db, nonEnforcedAuth)
	users.RegisterRoutes(g, cfg, db, enforcedAuth, nonEnforcedAuth)
}

func health(c echo.Context) error {
	return errors.WithStack(c.JSONBlob(http.StatusOK, healthResponse))
}

func notFoundHandler(c echo.Context) error {
	c.SetPath("/:path")
	return errcodes.NotFound("page")
}

// noStore keeps browsers and proxies from caching API responses.
func noStore(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		c.Response().Header().Set("Cache-Control", "no-store")
		return next(c)
	}
}

// redirectWWW sends www.pokedextracker.com (and www.staging...) to the bare
// domain, keeping the path and query.
func redirectWWW(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		host := c.Request().Host
		if name, _, err := net.SplitHostPort(host); err == nil {
			host = name
		}
		host = strings.ToLower(host)
		if !strings.HasPrefix(host, "www.") {
			return next(c)
		}
		target := "https://" + strings.TrimPrefix(host, "www.") + c.Request().URL.RequestURI()
		return errors.WithStack(c.Redirect(http.StatusMovedPermanently, target))
	}
}

// clientIP reads a visitor's address for c.RealIP() (kept as a user's last IP)
// from X-Forwarded-For: the last address in it that isn't a private one, which
// is the one Fly's proxy adds. Earlier addresses come from the visitor and can
// be anything. Without the header, like in development, it's the connection's.
func clientIP() echo.IPExtractor {
	return echo.ExtractIPFromXFFHeader()
}

// blogProxy forwards /blog to the hosted Ghost blog, which is set up to live
// at pokedextracker.com/blog, so the path is passed through unchanged. The
// upstream sees its own host name, which it needs for TLS and routing.
func blogProxy(rawURL string) (echo.HandlerFunc, error) {
	target, err := url.Parse(rawURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return nil, errors.Errorf("invalid blog URL %q", rawURL)
	}
	proxy := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.Out.URL.Scheme = target.Scheme
			r.Out.URL.Host = target.Host
			r.Out.Host = target.Host
			forwardHeaders(r)
		},
		// An unreachable blog is the upstream's problem, not a server error,
		// so it's logged rather than reported.
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			glogger.FromContext(r.Context()).Err(err).Warn("blog proxy error")
			http.Error(w, http.StatusText(http.StatusBadGateway), http.StatusBadGateway)
		},
	}
	return serveProxy(proxy), nil
}

// forwardHeaders passes on the forwarding headers a proxied request came in
// with, which Rewrite drops, adding the visitor's address to X-Forwarded-For.
func forwardHeaders(r *httputil.ProxyRequest) {
	for _, name := range []string{"Forwarded", "X-Forwarded-Host", "X-Forwarded-Proto"} {
		if values, ok := r.In.Header[name]; ok {
			r.Out.Header[name] = values
		}
	}
	if clientIP, _, err := net.SplitHostPort(r.In.RemoteAddr); err == nil {
		if prior := r.In.Header["X-Forwarded-For"]; len(prior) > 0 {
			clientIP = strings.Join(prior, ", ") + ", " + clientIP
		}
		r.Out.Header.Set("X-Forwarded-For", clientIP)
	}
}

// serveProxy runs a reverse proxy as an Echo handler.
func serveProxy(proxy *httputil.ReverseProxy) echo.HandlerFunc {
	return func(c echo.Context) (err error) {
		// ReverseProxy panics with http.ErrAbortHandler when copying a response
		// fails partway through. When that's because the visitor left (the
		// request is canceled), it's routine and shouldn't reach the recovery
		// middleware as a 500. A broken upstream still does.
		defer func() {
			if recovered := recover(); recovered != nil {
				abort, ok := recovered.(error)
				if !ok || !errors.Is(abort, http.ErrAbortHandler) || c.Request().Context().Err() == nil {
					panic(recovered)
				}
				err = nil
			}
		}()
		proxy.ServeHTTP(c.Response(), c.Request())
		return nil
	}
}
