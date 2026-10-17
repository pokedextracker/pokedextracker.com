package server

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"path"
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
)

var healthResponse = []byte(`{"healthy":true}`)

// New builds the server for the whole site: the API under /api, the /blog
// proxy, and the embedded frontend for everything else.
func New(cfg *config.Config, db *pg.DB) (*http.Server, error) {
	frontend, err := webapp.Handler()
	if err != nil {
		return nil, errors.WithStack(err)
	}
	return newServer(cfg, db, frontend)
}

func newServer(cfg *config.Config, db *pg.DB, frontend http.Handler) (*http.Server, error) {
	e := echo.New()

	e.Logger.SetLevel(log.OFF)

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
	e.Use(middleware.GzipWithConfig(middleware.GzipConfig{Skipper: skipGzip}))

	e.GET("/health", health)

	api := e.Group("/api", noStore)
	api.GET("/health", health)
	registerAPI(api, cfg, db)
	// Unknown API paths are a JSON 404, never the frontend.
	api.Any("", notFoundHandler)
	api.Any("/*", notFoundHandler)

	// TODO(cleanup): remove after the cutover. The old Fly apps run this API
	// behind an nginx proxy that strips /api, so until they're gone, the API
	// also answers at the root. None of these paths collide with frontend
	// routes.
	registerAPI(e.Group(""), cfg, db)

	if cfg.BlogURL != "" {
		blog, err := blogProxy(cfg.BlogURL)
		if err != nil {
			return nil, err
		}
		e.Any("/blog", blog)
		e.Any("/blog/*", blog)
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
		if !strings.HasPrefix(host, "www.") {
			return next(c)
		}
		if index := strings.LastIndex(host, ":"); index >= 0 && !strings.Contains(host[index:], "]") {
			host = host[:index]
		}
		return errors.WithStack(c.Redirect(http.StatusMovedPermanently, "https://"+strings.TrimPrefix(host, "www.")+c.Request().RequestURI))
	}
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
		Director: func(r *http.Request) {
			r.URL.Scheme = target.Scheme
			r.URL.Host = target.Host
			r.Host = target.Host
		},
	}
	return echo.WrapHandler(proxy), nil
}

// skipGzip leaves out responses that are already compressed: images, and the
// blog, whose upstream compresses its own responses.
func skipGzip(c echo.Context) bool {
	requestPath := c.Request().URL.Path
	if requestPath == "/blog" || strings.HasPrefix(requestPath, "/blog/") {
		return true
	}
	switch strings.ToLower(path.Ext(requestPath)) {
	case ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp":
		return true
	}
	return false
}
