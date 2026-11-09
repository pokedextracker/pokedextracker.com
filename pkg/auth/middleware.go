package auth

import (
	"context"
	"regexp"

	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v5"
	"github.com/pkg/errors"
	"github.com/pokedextracker/pokedextracker.com/pkg/config"
	"github.com/pokedextracker/pokedextracker.com/pkg/errcodes"
	"github.com/robinjoseph08/golib/logger"
)

const (
	sessionKey = "session"
	userIDKey  = "userID"
)

var authHeaderRE = regexp.MustCompile(`^Bearer (\S+)$`)

// tokenChecker turns a token into the session it was signed for, and checks
// that the session's user still exists.
type tokenChecker interface {
	ParseToken(ctx context.Context, signed string) (*Session, error)
	TokenUserExists(ctx context.Context, session *Session) (bool, error)
}

// Middleware returns the auth middleware for each kind of route.
//
//   - enforced needs a token whose user still exists with the same username.
//     It's for routes that allow access by the username in the URL, which a
//     token can outlive: the account can be deleted and the username taken by
//     someone new.
//   - tokenOnly needs a valid token, without looking its user up. It's for
//     routes whose handlers check ownership against the database themselves,
//     so the lookup would only add a round trip.
//   - optional reads a token if there is one. Its handlers don't use the
//     session for access, so its user isn't looked up either.
func Middleware(cfg *config.Config, db *pg.DB) (enforced, tokenOnly, optional echo.MiddlewareFunc) {
	authService := NewService(cfg, db)

	return newMiddlewareFunction(authService, true, true),
		newMiddlewareFunction(authService, true, false),
		newMiddlewareFunction(authService, false, false)
}

func newMiddlewareFunction(authService tokenChecker, shouldEnforce, checkUser bool) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			ctx := c.Request().Context()

			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				if shouldEnforce {
					return errcodes.MissingAuthentication()
				}
				return next(c)
			}
			match := authHeaderRE.FindAllStringSubmatch(authHeader, -1)
			if len(match) == 0 {
				if shouldEnforce {
					return errcodes.BadAuthHeaderFormat()
				}
				return next(c)
			}

			signed := match[0][1]
			session, err := authService.ParseToken(ctx, signed)
			if err != nil {
				if shouldEnforce {
					return errors.WithStack(err)
				}
				return next(c)
			}

			if checkUser {
				exists, err := authService.TokenUserExists(ctx, session)
				if err != nil {
					return errors.WithStack(err)
				}
				if !exists {
					return errcodes.DeletedUser()
				}
			}

			c.Set(sessionKey, session)
			// Error reports name the user from this too (errcodes.Handler).
			c.Set(userIDKey, session.ID)

			// Update the logger with session info.
			log := logger.FromContext(c.Request().Context())
			log = log.Root(logger.Data{
				"user_id": session.ID,
			})
			c.SetRequest(c.Request().WithContext(log.WithContext(c.Request().Context())))

			return next(c)
		}
	}
}

func FromContext(c *echo.Context) *Session {
	sess, ok := c.Get(sessionKey).(*Session)
	if !ok {
		return nil
	}

	return sess
}
