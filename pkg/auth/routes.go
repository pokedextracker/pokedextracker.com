package auth

import (
	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v4"
	"github.com/pokedextracker/pokedextracker.com/pkg/config"
)

// RegisterRoutes registers routes onto an Echo route group.
func RegisterRoutes(e *echo.Group, cfg *config.Config, db *pg.DB, nonEnforceAuth echo.MiddlewareFunc) {
	sessionService := NewService(cfg, db)

	h := &handler{
		authService: sessionService,
	}

	e.POST("/sessions", h.create, nonEnforceAuth)
}
