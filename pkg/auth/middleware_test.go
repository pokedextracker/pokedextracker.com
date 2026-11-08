package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v5"
	"github.com/pokedextracker/pokedextracker.com/pkg/errcodes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeChecker accepts any token as ash's, and says whether ash still exists,
// or fails to look.
type fakeChecker struct {
	exists bool
	err    error
}

func (f fakeChecker) ParseToken(context.Context, string) (*Session, error) {
	return &Session{ID: 1, Username: "ash"}, nil
}

func (f fakeChecker) TokenUserExists(context.Context, *Session) (bool, error) {
	return f.exists, f.err
}

func TestMiddlewareChecksTheUserStillExists(t *testing.T) {
	t.Parallel()

	cases := map[string]struct {
		exists      bool
		enforce     bool
		wantErr     error
		wantSession bool
	}{
		"existing user":               {exists: true, enforce: true, wantSession: true},
		"existing user, not enforced": {exists: true, enforce: false, wantSession: true},
		"deleted user":                {exists: false, enforce: true, wantErr: errcodes.DeletedUser()},
		"deleted user, not enforced":  {exists: false, enforce: false},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.Header.Set("Authorization", "Bearer token")
			c := echo.New().NewContext(req, httptest.NewRecorder())

			var session *Session
			next := func(c *echo.Context) error {
				session = FromContext(c)
				return nil
			}
			err := newMiddlewareFunction(fakeChecker{exists: tc.exists}, tc.enforce)(next)(c)

			assert.Equal(t, tc.wantErr, err)
			assert.Equal(t, tc.wantSession, session != nil)
		})
	}
}

// A failed lookup fails the request rather than letting the token through or
// quietly treating its user as signed out.
func TestMiddlewareFailsWhenTheUserCantBeChecked(t *testing.T) {
	t.Parallel()

	lookupErr := errors.New("database is down")
	for _, enforce := range []bool{true, false} {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer token")
		c := echo.New().NewContext(req, httptest.NewRecorder())

		called := false
		next := func(*echo.Context) error {
			called = true
			return nil
		}
		err := newMiddlewareFunction(fakeChecker{err: lookupErr}, enforce)(next)(c)

		require.ErrorIs(t, err, lookupErr, "enforce=%v", enforce)
		assert.False(t, called, "enforce=%v", enforce)
	}
}
