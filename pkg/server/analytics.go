package server

import (
	"html"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/pkg/errors"
	"github.com/pokedextracker/pokedextracker.com/pkg/config"
	glogger "github.com/robinjoseph08/golib/logger"
)

// The site's web analytics come from a self-hosted Umami. The tracker and the
// events it sends go through /stats on this server, so they're same-origin:
// no CORS, fewer ad blockers, and Umami's address stays out of the page.
const (
	analyticsPrefix     = "/stats"
	analyticsScriptPath = "/script.js"
	analyticsSendPath   = "/api/send"
	// Tracker events are small JSON objects. This keeps anyone from using the
	// proxy to push large uploads at Umami.
	analyticsMaxBody = 64 << 10
)

// analyticsResponseHeaders are the only Umami response headers sent on to the
// visitor. Anything else would apply to this site's whole origin: Cloudflare in
// front of Umami adds Nel and Report-To (browsers would report this site's
// network errors to Cloudflare) and Alt-Svc (browsers would try HTTP/3 here), and
// Location would reveal Umami's address.
var analyticsResponseHeaders = []string{
	"Content-Encoding",
	"Content-Length",
	"Content-Type",
	"ETag",
	"Last-Modified",
	"Vary",
}

// analyticsEnabled reports whether Umami is set up. Without it, the page gets
// no tracker and /stats isn't served.
func analyticsEnabled(cfg *config.Config) bool {
	return cfg.UmamiURL != "" && cfg.UmamiWebsiteID != ""
}

// analyticsScript is the tracker tag added to index.html's <head>, or nothing
// when analytics are off. The tracker records a pageview on every route
// change, and sends to api/send next to where it was loaded from, so its
// events also go through /stats. It's async, not defer: deferred scripts run
// in order, so a slow or unreachable Umami would hold up the app's own
// (deferred) bundle.
//
// Everything it records is tagged with the deployed version, so the dashboard
// can show who's still on an older build: a tab keeps the version it loaded
// with until it's reloaded.
func analyticsScript(cfg *config.Config) string {
	if !analyticsEnabled(cfg) {
		return ""
	}
	tag := ""
	if cfg.Version != "" {
		tag = ` data-tag="` + html.EscapeString(cfg.Version) + `"`
	}
	return `<script async src="` + analyticsPrefix + analyticsScriptPath + `" data-website-id="` + html.EscapeString(cfg.UmamiWebsiteID) + `"` + tag + `></script>`
}

// registerAnalytics forwards the tracker script and its event endpoint to
// Umami, and nothing else: any other path under /stats is a 404 here.
func registerAnalytics(e *echo.Echo, rawURL string) error {
	target, err := url.Parse(rawURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return errors.New("invalid Umami URL")
	}

	transport := http.DefaultTransport.(*http.Transport).Clone() //nolint:forcetypeassert // The standard library's default always is one.
	// Umami runs on a home server. If it's slow or down, give up instead of
	// holding the visitor's request open.
	transport.ResponseHeaderTimeout = 10 * time.Second

	proxy := &httputil.ReverseProxy{
		// SetURL sends Umami's own host name, which Cloudflare in front of it
		// requires, and Rewrite drops any incoming X-Forwarded-* headers. The
		// visitor's other headers pass through, including User-Agent and
		// Fly-Client-IP, which Umami reads for the visitor's browser, location,
		// and visit. Their cookies and credentials for this site don't.
		Rewrite: func(r *httputil.ProxyRequest) {
			r.Out.URL.Path = strings.TrimPrefix(r.In.URL.Path, analyticsPrefix)
			r.Out.URL.RawPath = ""
			r.SetURL(target)
			r.Out.Header.Del("Cookie")
			r.Out.Header.Del("Authorization")
		},
		Transport: transport,
		ModifyResponse: func(res *http.Response) error {
			headers := http.Header{}
			for _, name := range analyticsResponseHeaders {
				if values := res.Header.Values(name); len(values) > 0 {
					headers[http.CanonicalHeaderKey(name)] = values
				}
			}
			res.Header = headers

			fresh := res.StatusCode == http.StatusOK || res.StatusCode == http.StatusNotModified
			if strings.HasSuffix(res.Request.URL.Path, analyticsScriptPath) && fresh {
				res.Header.Set("Cache-Control", "public, max-age=3600")
			} else {
				res.Header.Set("Cache-Control", "no-store")
			}
			return nil
		},
		// Analytics being unreachable is Umami's problem, not a server error,
		// so it's logged rather than reported.
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			glogger.FromContext(r.Context()).Err(err).Warn("analytics proxy error")
			w.Header().Set("Cache-Control", "no-store")
			http.Error(w, http.StatusText(http.StatusBadGateway), http.StatusBadGateway)
		},
	}
	forward := serveProxy(proxy)

	e.GET(analyticsPrefix+analyticsScriptPath, forward)
	e.HEAD(analyticsPrefix+analyticsScriptPath, forward)
	e.POST(analyticsPrefix+analyticsSendPath, func(c *echo.Context) error {
		if c.Request().ContentLength > analyticsMaxBody {
			c.Response().Header().Set("Cache-Control", "no-store")
			return errors.WithStack(c.NoContent(http.StatusRequestEntityTooLarge))
		}
		// Bodies without a length are still cut off at the limit.
		c.Request().Body = http.MaxBytesReader(c.Response(), c.Request().Body, analyticsMaxBody)
		return forward(c)
	})
	e.Any(analyticsPrefix, notFoundHandler)
	e.Any(analyticsPrefix+"/*", notFoundHandler)
	return nil
}
