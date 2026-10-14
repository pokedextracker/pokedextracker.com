package auth

import (
	"regexp"

	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/config"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/errcodes"
	"github.com/robinjoseph08/golib/logger"
)

const (
	sessionKey = "session"
	userIDKey  = "userID"
)

var authHeaderRE = regexp.MustCompile(`^Bearer (\S+)$`)

func Middleware(cfg *config.Config, db *pg.DB) (echo.MiddlewareFunc, echo.MiddlewareFunc) {
	authService := NewService(cfg, db)

	return newMiddlewareFunction(authService, true), newMiddlewareFunction(authService, false)
}

func newMiddlewareFunction(authService *Service, shouldEnforce bool) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ctx := c.Request().Context()

			authHeader := c.Request().Header.Get("authorization")
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

			c.Set(sessionKey, session)
			c.Set(userIDKey, session.ID)

			// Update the logger with session info.
			log := logger.FromContext(c.Request().Context())
			log = log.Root(logger.Data{
				"user_id": session.ID,
			})
			c.SetRequest(c.Request().WithContext(log.WithContext(c.Request().Context())))

			// TODO: configure error reporting user info.

			return next(c)
		}
	}
}

func FromContext(c echo.Context) *Session {
	sess, ok := c.Get(sessionKey).(*Session)
	if !ok {
		return nil
	}

	return sess
}
