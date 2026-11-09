package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/labstack/echo/v5"
	"github.com/pokedextracker/pokedextracker.com/pkg/errcodes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeChecker accepts any token as ash's, and says whether ash still exists,
// or fails to look. It counts the lookups.
type fakeChecker struct {
	exists  bool
	err     error
	lookups *atomic.Int32
}

func (f fakeChecker) ParseToken(context.Context, string) (*Session, error) {
	return &Session{ID: 1, Username: "ash"}, nil
}

func (f fakeChecker) TokenUserExists(context.Context, *Session) (bool, error) {
	f.lookups.Add(1)
	return f.exists, f.err
}

// run sends a request with a token through the middleware, and returns
// whether the handler got a session, how many lookups it made, and its error.
func run(t *testing.T, checker fakeChecker, enforce, checkUser bool) (bool, int32, error) {
	t.Helper()

	checker.lookups = &atomic.Int32{}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer token")
	c := echo.New().NewContext(req, httptest.NewRecorder())

	var session *Session
	next := func(c *echo.Context) error {
		session = FromContext(c)
		return nil
	}
	err := newMiddlewareFunction(checker, enforce, checkUser)(next)(c)
	return session != nil, checker.lookups.Load(), err
}

func TestMiddlewareLooksTheUserUpOnlyForEnforcedRoutes(t *testing.T) {
	t.Parallel()

	cases := map[string]struct {
		enforce, checkUser bool
		exists             bool
		wantErr            error
		wantSession        bool
		wantLookups        int32
	}{
		"enforced, existing user":   {enforce: true, checkUser: true, exists: true, wantSession: true, wantLookups: 1},
		"enforced, deleted user":    {enforce: true, checkUser: true, exists: false, wantErr: errcodes.DeletedUser(), wantLookups: 1},
		"token only, existing user": {enforce: true, checkUser: false, exists: true, wantSession: true},
		"token only, deleted user":  {enforce: true, checkUser: false, exists: false, wantSession: true},
		"optional, deleted user":    {enforce: false, checkUser: false, exists: false, wantSession: true},
		"optional, existing user":   {enforce: false, checkUser: false, exists: true, wantSession: true},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			gotSession, lookups, err := run(t, fakeChecker{exists: tc.exists}, tc.enforce, tc.checkUser)

			assert.Equal(t, tc.wantErr, err)
			assert.Equal(t, tc.wantSession, gotSession)
			assert.Equal(t, tc.wantLookups, lookups)
		})
	}
}

// A failed lookup fails the request rather than letting the token through.
func TestMiddlewareFailsWhenTheUserCantBeChecked(t *testing.T) {
	t.Parallel()

	lookupErr := errors.New("database is down")
	gotSession, _, err := run(t, fakeChecker{err: lookupErr}, true, true)

	require.ErrorIs(t, err, lookupErr)
	assert.False(t, gotSession)
}

// Token-only routes still need a token, like enforced ones.
func TestTokenOnlyMiddlewareNeedsAToken(t *testing.T) {
	t.Parallel()

	cases := map[string]struct {
		header  string
		wantErr error
	}{
		"missing":   {"", errcodes.MissingAuthentication()},
		"malformed": {"Token abc", errcodes.BadAuthHeaderFormat()},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			req := httptest.NewRequest(http.MethodPost, "/", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			c := echo.New().NewContext(req, httptest.NewRecorder())
			called := false
			next := func(*echo.Context) error {
				called = true
				return nil
			}
			checker := fakeChecker{exists: true, lookups: &atomic.Int32{}}

			err := newMiddlewareFunction(checker, true, false)(next)(c)

			assert.Equal(t, tc.wantErr, err)
			assert.False(t, called)
		})
	}
}
