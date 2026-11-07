package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/pkg/errors"
	"github.com/pokedextracker/pokedextracker.com/internal/webapp"
	"github.com/pokedextracker/pokedextracker.com/pkg/dexes"
	"github.com/pokedextracker/pokedextracker.com/pkg/errcodes"
	"github.com/pokedextracker/pokedextracker.com/pkg/games"
	"github.com/pokedextracker/pokedextracker.com/pkg/users"
	"github.com/stretchr/testify/assert"
)

type fakeLookup struct {
	users map[string]*users.User
	dexes map[string]*dexes.Dex
	err   error
}

func (l fakeLookup) user(_ context.Context, username string) (*users.User, error) {
	if l.err != nil {
		return nil, l.err
	}
	if user, ok := l.users[username]; ok {
		return user, nil
	}
	// Wrapped, as the services return it.
	return nil, errors.WithStack(errcodes.NotFound("user"))
}

func (l fakeLookup) dex(_ context.Context, username, slug string) (*dexes.Dex, error) {
	if l.err != nil {
		return nil, l.err
	}
	if dex, ok := l.dexes[username+"/"+slug]; ok {
		return dex, nil
	}
	// Wrapped, as the services return it.
	return nil, errors.WithStack(errcodes.NotFound("dex"))
}

var scarlet = &dexes.Dex{Title: "Scarlet Living Dex", Slug: "scarlet", Caught: 120, Total: 400, Game: &games.Game{Name: "Scarlet"}}

var testLookup = fakeLookup{
	users: map[string]*users.User{
		"ash": {
			Username:    "ash",
			DateCreated: time.Date(2020, 5, 1, 0, 0, 0, 0, time.UTC),
			Dexes: []*dexes.Dex{
				scarlet,
				{Title: "Empty", Caught: 0, Total: 400},
				{Title: "Third", Caught: 1, Total: 10},
				{Title: "Fourth", Caught: 2, Total: 10},
			},
		},
		"brock":  {Username: "brock", Dexes: []*dexes.Dex{{Title: "Empty", Total: 400}}},
		"gary":   {Username: "gary"},
		"<evil>": {Username: "<evil>", Dexes: []*dexes.Dex{{Title: `"></script>`, Caught: 1, Total: 1}}},
	},
	dexes: map[string]*dexes.Dex{
		"ash/scarlet": scarlet,
		"brock/empty": {Title: "Empty", Total: 400},
	},
}

func pageFor(t *testing.T, target string, lookup pageLookup) webapp.Page {
	t.Helper()
	r := httptest.NewRequest(http.MethodGet, target, nil)
	r.Host = "pokedextracker.com"
	return pages("production", lookup, time.Second)(r)
}

func TestSitePages(t *testing.T) {
	t.Parallel()

	for _, c := range []struct{ target, title, canonical string }{
		{"/", "Pokédex Tracker | Track the Progress of Your Living Dex Completion", "/"},
		{"/login", "Login | Pokédex Tracker", "/login"},
		{"/login/", "Login | Pokédex Tracker", "/login"},
		{"//login", "Login | Pokédex Tracker", "/login"},
		{"/Login", "Login | Pokédex Tracker", "/login"},
		{"/register", "Register | Pokédex Tracker", "/register"},
		{"/REGISTER?ref=reddit", "Register | Pokédex Tracker", "/register"},
	} {
		target := c.target
		pg := pageFor(t, target, testLookup)
		assert.Equal(t, 0, pg.Status, target)
		assert.Contains(t, pg.Head, "<title>"+c.title+"</title>", target)
		assert.NotContains(t, pg.Head, "noindex", target)
		canonical := "https://pokedextracker.com" + c.canonical
		assert.Contains(t, pg.Head, `<link rel="canonical" href="`+canonical+`" />`, target)
		assert.Contains(t, pg.Head, `<meta property="og:url" content="`+canonical+`" />`, target)
	}
}

func TestHomeHasSiteStructuredData(t *testing.T) {
	t.Parallel()

	pg := pageFor(t, "/", testLookup)
	assert.Contains(t, pg.Head, `"@type":"WebSite"`)
	assert.Contains(t, pg.Head, `"@type":"Organization"`)
	assert.Contains(t, pg.Head, `<meta property="og:title" content="Pokédex Tracker" />`, "a link to the site is previewed with its name")
	assert.NotContains(t, pageFor(t, "/login", testLookup).Head, "ld+json")
}

func TestPrivatePagesAreNotIndexed(t *testing.T) {
	t.Parallel()

	for target, title := range map[string]string{"/account": "Account | Pokédex Tracker", "/profile": "Pokédex Tracker"} {
		pg := pageFor(t, target, testLookup)
		assert.Contains(t, pg.Head, "<title>"+title+"</title>", target)
		assert.Equal(t, 0, pg.Status, target)
		assert.Contains(t, pg.Head, `<meta name="robots" content="noindex" />`, target)
		assert.NotContains(t, pg.Head, "canonical", target)
	}
}

func TestUnknownPagesAreNotFound(t *testing.T) {
	t.Parallel()

	for _, target := range []string{"/nope", "/index.html", "/u", "/u/", "/u/nobody", "/u/Ash", "/u/ash/nope", "/u/ash/Scarlet", "/u/ash/scarlet/more", "/blog/post", "/u/%ff", "/u/a%00b", "/u/ash/%ff"} {
		pg := pageFor(t, target, testLookup)
		assert.Equal(t, http.StatusNotFound, pg.Status, target)
		assert.Contains(t, pg.Head, "<title>404 Not Found | Pokédex Tracker</title>", target)
		assert.Contains(t, pg.Head, "noindex", target)
	}
}

func TestProfiles(t *testing.T) {
	t.Parallel()

	for _, target := range []string{"/u/ash/", "/U/ash", "/u//ash", "/u/ash/scarlet/.."} {
		assert.Contains(t, pageFor(t, target, testLookup).Head, `<link rel="canonical" href="https://pokedextracker.com/u/ash" />`, target)
	}

	pg := pageFor(t, "/u/ash", testLookup)
	assert.Equal(t, 0, pg.Status)
	assert.Contains(t, pg.Head, "<title>ash&#39;s Profile | Pokédex Tracker</title>")
	assert.Contains(t, pg.Head, `content="ash&#39;s Living Dex progress on Pokédex Tracker: Scarlet Living Dex (120/400), Empty (0/400), Third (1/10), and 1 more."`)
	assert.Contains(t, pg.Head, `<link rel="canonical" href="https://pokedextracker.com/u/ash" />`)
	assert.Contains(t, pg.Head, `<meta property="og:type" content="profile" />`)
	assert.Contains(t, pg.Head, `"@type":"ProfilePage"`)
	assert.Contains(t, pg.Head, `"dateCreated":"2020-05-01"`)
	assert.NotContains(t, pg.Head, "noindex")
}

func TestProfilesWithNothingCaughtAreNotIndexed(t *testing.T) {
	t.Parallel()

	for _, target := range []string{"/u/brock", "/u/gary"} {
		pg := pageFor(t, target, testLookup)
		assert.Equal(t, 0, pg.Status, "they exist, so they aren't a 404: "+target)
		assert.Contains(t, pg.Head, `<meta name="robots" content="noindex" />`, target)
		assert.NotContains(t, pg.Head, "canonical", target)
	}
	assert.Contains(t, pageFor(t, "/u/gary", testLookup).Head, `content="gary&#39;s Living Dex progress on Pokédex Tracker."`)
}

func TestDexes(t *testing.T) {
	t.Parallel()

	pg := pageFor(t, "/u/ash/scarlet", testLookup)
	assert.Equal(t, 0, pg.Status)
	assert.Contains(t, pg.Head, "<title>ash&#39;s Scarlet Living Dex | Pokédex Tracker</title>")
	assert.Contains(t, pg.Head, `content="ash has caught 120 of 400 Pokémon (30%) in their Scarlet Living Dex (Scarlet) on Pokédex Tracker."`)
	assert.Contains(t, pg.Head, `<link rel="canonical" href="https://pokedextracker.com/u/ash/scarlet" />`)
	assert.NotContains(t, pg.Head, "noindex")

	pg = pageFor(t, "/u/brock/empty", testLookup)
	assert.Equal(t, 0, pg.Status)
	assert.Contains(t, pg.Head, "noindex", "a dex with nothing caught isn't indexed")
}

func TestURLsArePercentEncoded(t *testing.T) {
	t.Parallel()

	lookup := fakeLookup{dexes: map[string]*dexes.Dex{"ash/pokémon dex": scarlet}}
	pg := pageFor(t, "/u/ash/pok%C3%A9mon%20dex", lookup)
	assert.Contains(t, pg.Head, `<link rel="canonical" href="https://pokedextracker.com/u/ash/pok%C3%A9mon%20dex" />`)
	assert.Contains(t, pg.Head, `<meta property="og:url" content="https://pokedextracker.com/u/ash/pok%C3%A9mon%20dex" />`)
}

func TestUserContentIsEscaped(t *testing.T) {
	t.Parallel()

	pg := pageFor(t, "/u/<evil>", testLookup)
	assert.NotContains(t, pg.Head, "<evil>")
	assert.NotContains(t, pg.Head, `"></script>`)
	assert.Contains(t, pg.Head, "\\u003cevil\\u003e", "the JSON-LD escapes it too")
}

// slowLookup waits for the lookup's context to end, like a query on a database
// that's too slow.
type slowLookup struct{}

func (slowLookup) user(ctx context.Context, _ string) (*users.User, error) {
	<-ctx.Done()
	return nil, errors.WithStack(ctx.Err())
}

func (slowLookup) dex(ctx context.Context, _, _ string) (*dexes.Dex, error) {
	<-ctx.Done()
	return nil, errors.WithStack(ctx.Err())
}

func TestLookupErrorsAreServiceUnavailable(t *testing.T) {
	t.Parallel()

	broken := fakeLookup{err: errors.New("database down")}
	for _, target := range []string{"/u/ash", "/u/ash/scarlet"} {
		pg := pageFor(t, target, broken)
		assert.Equal(t, http.StatusServiceUnavailable, pg.Status, target)
		assert.Contains(t, pg.Head, "<title>Pokédex Tracker</title>", target)
		assert.NotContains(t, pg.Head, "noindex", "a crawler during an outage doesn't drop the page: "+target)
		assert.NotContains(t, pg.Head, "canonical", target)
	}
}

func TestLookupTimeoutsAreTheGenericPage(t *testing.T) {
	t.Parallel()

	for _, target := range []string{"/u/ash", "/u/ash/scarlet"} {
		r := httptest.NewRequest(http.MethodGet, target, nil)
		start := time.Now()
		pg := pages("production", slowLookup{}, 10*time.Millisecond)(r)
		assert.Less(t, time.Since(start), time.Second, "the page doesn't wait on the database: "+target)
		assert.Equal(t, 0, pg.Status, "the app will likely still load it: "+target)
		assert.Contains(t, pg.Head, "<title>Pokédex Tracker</title>", target)
		assert.NotContains(t, pg.Head, "noindex", target)
		assert.NotContains(t, pg.Head, "canonical", target)
	}
}

func TestOnlyProductionIsIndexed(t *testing.T) {
	t.Parallel()

	for _, environment := range []string{"staging", "development"} {
		r := httptest.NewRequest(http.MethodGet, "/u/ash", nil)
		r.Host = "staging.pokedextracker.com"
		pg := pages(environment, testLookup, time.Second)(r)
		assert.Contains(t, pg.Head, `<meta name="robots" content="noindex" />`, environment)
		assert.Contains(t, pg.Head, `<meta property="og:url" content="https://staging.pokedextracker.com/u/ash" />`, environment)
	}
}
