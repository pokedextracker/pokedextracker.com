package server

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/pkg/errors"
	"github.com/pokedextracker/pokedextracker.com/internal/webapp"
	"github.com/pokedextracker/pokedextracker.com/pkg/dexes"
	"github.com/pokedextracker/pokedextracker.com/pkg/errcodes"
	"github.com/pokedextracker/pokedextracker.com/pkg/users"
	glogger "github.com/robinjoseph08/golib/logger"
)

// productionOrigin is where canonical links point in production. Elsewhere
// they point at the host that was asked, since those pages aren't indexed.
const productionOrigin = "https://pokedextracker.com"

const siteName = "Pokédex Tracker"

const homeDescription = "A tool for tracking your Living Dex progress. Easily toggle between and track your captured Pokémon, find the locations of those left to be captured, and share a public link with others to see how you can help each other out."

// lookupTimeout is how long a page waits on the database for its user or dex
// before it's sent without them, so a slow database doesn't hold up the page.
const lookupTimeout = time.Second

// profileDexLimit is how many dexes a profile's description names.
const profileDexLimit = 3

// pageLookup finds the users and dexes behind profile and dex pages. A
// missing one is an errcodes.NotFound error.
type pageLookup interface {
	user(ctx context.Context, username string) (*users.User, error)
	dex(ctx context.Context, username, slug string) (*dexes.Dex, error)
}

type serviceLookup struct {
	users *users.Service
	dexes *dexes.Service
}

func (l serviceLookup) user(ctx context.Context, username string) (*users.User, error) {
	user, err := l.users.RetrieveUser(ctx, users.RetrieveUserOptions{Username: &username})
	return user, errors.WithStack(err)
}

func (l serviceLookup) dex(ctx context.Context, username, slug string) (*dexes.Dex, error) {
	dex, err := l.dexes.RetrieveDex(ctx, dexes.RetrieveDexOptions{Username: &username, Slug: &slug})
	return dex, errors.WithStack(err)
}

// page is what a frontend route tells search engines and link previews.
type page struct {
	status int
	title  string
	// ogTitle is the title link previews show, when it's not the page's.
	ogTitle     string
	description string
	// noindex keeps the page out of search results. Profiles and dexes with
	// nothing caught are kept out, so the site's own pages aren't crowded by
	// thousands of empty ones.
	noindex bool
	// uncertain is a page whose lookup didn't finish. It says neither noindex
	// nor canonical, so it doesn't change what search engines already know.
	uncertain bool
	ogType    string
	jsonLD    []any
}

// pages builds the page block of index.html for each frontend route, mirroring
// the routes in app/components/pages/App.tsx and the titles the app sets.
func pages(environment string, lookup pageLookup, timeout time.Duration) webapp.PageFunc {
	return func(r *http.Request) webapp.Page {
		ctx, cancel := context.WithTimeout(r.Context(), timeout)
		defer cancel()
		p := clean(r.URL.Path)
		production := environment == "production"
		origin := productionOrigin
		if !production {
			origin = "https://" + r.Host
		}
		pg := routePage(ctx, p, origin, lookup)
		// Only production is meant to be found. Staging is a copy of it.
		if !production {
			pg.noindex = true
		}
		return webapp.Page{Status: pg.status, Head: pg.head(origin + escapePath(p))}
	}
}

// escapePath percent-encodes a decoded path for a URL, like a slug with a space
// or an accent in it.
func escapePath(p string) string {
	return (&url.URL{Path: p}).EscapedPath()
}

// fixedRoutes are the routes in App.tsx without parameters.
var fixedRoutes = map[string]bool{"/": true, "/login": true, "/register": true, "/account": true, "/profile": true}

// clean puts a path in the form its canonical link uses. React Router matches
// routes regardless of case, so /Login is the login page and /U/ash is ash's
// profile, but usernames and slugs are looked up exactly, as the app does.
func clean(p string) string {
	p = path.Clean("/" + p)
	if lower := strings.ToLower(p); fixedRoutes[lower] {
		return lower
	}
	if len(p) >= 3 && strings.EqualFold(p[:3], "/u/") {
		return "/u/" + p[3:]
	}
	return p
}

func routePage(ctx context.Context, p, origin string, lookup pageLookup) page {
	switch p {
	case "/":
		return page{
			title:       siteName + " | Track the Progress of Your Living Dex Completion",
			ogTitle:     siteName,
			description: homeDescription,
			jsonLD:      []any{website(origin), organization(origin)},
		}
	case "/login":
		return page{
			title:       "Login | " + siteName,
			description: "Log in to Pokédex Tracker to keep tracking your Living Dex progress.",
		}
	case "/register":
		return page{
			title:       "Register | " + siteName,
			description: "Create a free Pokédex Tracker account to track your Living Dex, find where to catch the Pokémon you're missing, and share your progress.",
		}
	case "/account":
		// The visitor's own settings.
		return page{title: "Account | " + siteName, description: homeDescription, noindex: true}
	case "/profile":
		// A redirect to the visitor's own profile.
		return page{title: siteName, description: homeDescription, noindex: true}
	}

	parts := strings.Split(strings.TrimPrefix(p, "/"), "/")
	for _, part := range parts {
		// The database can't look up these, and no user or dex has them.
		if !utf8.ValidString(part) || strings.ContainsRune(part, 0) {
			return notFoundPage()
		}
	}
	if parts[0] == "u" && len(parts) == 2 {
		return profilePage(ctx, parts[1], origin, lookup)
	}
	if parts[0] == "u" && len(parts) == 3 {
		return dexPage(ctx, parts[1], parts[2], lookup)
	}
	return notFoundPage()
}

func notFoundPage() page {
	return page{
		status:      http.StatusNotFound,
		title:       "404 Not Found | " + siteName,
		description: homeDescription,
		noindex:     true,
	}
}

// lookupFailedPage is served when the database can't say whether a profile or
// dex exists. Either way it's the whole app, and says neither noindex nor 404,
// so a crawler that hits it doesn't drop the page.
//
// When the lookup only ran out of time, the database is likely just slow, and
// the app (and Google's render of it) will still load the page, so it's a 200
// with the site's generic tags. When the lookup failed, the app will fail too,
// so it's a 503, which tells crawlers to come back later rather than take the
// error the app shows as the page.
func lookupFailedPage(ctx context.Context, err error) page {
	pg := page{title: siteName, description: homeDescription, uncertain: true}
	if ctx.Err() != nil {
		glogger.FromContext(ctx).Err(err).Info("page lookup timed out")
		return pg
	}
	glogger.FromContext(ctx).Err(err).Warn("page lookup error")
	pg.status = http.StatusServiceUnavailable
	return pg
}

func profilePage(ctx context.Context, username, origin string, lookup pageLookup) page {
	user, err := lookup.user(ctx, username)
	if errors.Is(err, errcodes.NotFound("user")) {
		return notFoundPage()
	}
	if err != nil {
		return lookupFailedPage(ctx, err)
	}

	caught := false
	var named []string
	for _, dex := range user.Dexes {
		caught = caught || dex.Caught > 0
		if len(named) < profileDexLimit {
			named = append(named, fmt.Sprintf("%s (%d/%d)", dex.Title, dex.Caught, dex.Total))
		}
	}
	description := fmt.Sprintf("%s's Living Dex progress on %s.", user.Username, siteName)
	if len(named) > 0 {
		description = fmt.Sprintf("%s's Living Dex progress on %s: %s", user.Username, siteName, strings.Join(named, ", "))
		if len(user.Dexes) > len(named) {
			description += fmt.Sprintf(", and %d more", len(user.Dexes)-len(named))
		}
		description += "."
	}

	return page{
		title:       user.Username + "'s Profile | " + siteName,
		description: description,
		noindex:     !caught,
		ogType:      "profile",
		jsonLD: []any{map[string]any{
			"@context":    "https://schema.org",
			"@type":       "ProfilePage",
			"dateCreated": user.DateCreated.UTC().Format("2006-01-02"),
			"mainEntity": map[string]any{
				"@type": "Person",
				"name":  user.Username,
				"url":   origin + escapePath("/u/"+user.Username),
			},
		}},
	}
}

func dexPage(ctx context.Context, username, slug string, lookup pageLookup) page {
	dex, err := lookup.dex(ctx, username, slug)
	if errors.Is(err, errcodes.NotFound("dex")) {
		return notFoundPage()
	}
	if err != nil {
		return lookupFailedPage(ctx, err)
	}

	game := ""
	if dex.Game != nil && dex.Game.Name != "" {
		game = " (" + dex.Game.Name + ")"
	}
	percent := 0
	if dex.Total > 0 {
		percent = dex.Caught * 100 / dex.Total
	}

	return page{
		// The username is the one in the address, as the app shows it.
		title:       username + "'s " + dex.Title + " | " + siteName,
		description: fmt.Sprintf("%s has caught %d of %d Pokémon (%d%%) in their %s%s on %s.", username, dex.Caught, dex.Total, percent, dex.Title, game, siteName),
		noindex:     dex.Caught == 0,
	}
}

func website(origin string) map[string]any {
	return map[string]any{
		"@context":      "https://schema.org",
		"@type":         "WebSite",
		"name":          siteName,
		"alternateName": "A tool for tracking your Living Dex progress",
		"url":           origin,
	}
}

func organization(origin string) map[string]any {
	return map[string]any{
		"@context": "https://schema.org",
		"@type":    "Organization",
		"name":     siteName,
		"url":      origin,
		"logo":     origin + "/favicon/android-chrome-192x192.png",
		"sameAs": []string{
			"https://twitter.com/PokedexTracker",
			"https://github.com/pokedextracker",
			"https://www.patreon.com/pokedextracker",
		},
	}
}

// head writes the page block: what's between <!-- page --> and <!-- /page -->
// in app/index.html.
func (pg page) head(pageURL string) string {
	var b strings.Builder
	attr := html.EscapeString
	fmt.Fprintf(&b, "<title>%s</title>", attr(pg.title))
	fmt.Fprintf(&b, `<meta name="description" content="%s" />`, attr(pg.description))
	if pg.noindex {
		b.WriteString(`<meta name="robots" content="noindex" />`)
	} else if !pg.uncertain {
		fmt.Fprintf(&b, `<link rel="canonical" href="%s" />`, attr(pageURL))
	}
	ogType := pg.ogType
	if ogType == "" {
		ogType = "website"
	}
	fmt.Fprintf(&b, `<meta property="og:type" content="%s" />`, attr(ogType))
	fmt.Fprintf(&b, `<meta property="og:url" content="%s" />`, attr(pageURL))
	ogTitle := pg.ogTitle
	if ogTitle == "" {
		ogTitle = pg.title
	}
	fmt.Fprintf(&b, `<meta property="og:title" content="%s" />`, attr(ogTitle))
	fmt.Fprintf(&b, `<meta property="og:description" content="%s" />`, attr(pg.description))
	for _, data := range pg.jsonLD {
		// json.Marshal escapes <, >, and &, so a username can't close the
		// script. These are maps of strings, which always marshal.
		value, err := json.Marshal(data)
		if err != nil {
			continue
		}
		fmt.Fprintf(&b, `<script type="application/ld+json">%s</script>`, value)
	}
	return b.String()
}
