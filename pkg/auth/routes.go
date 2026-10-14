package auth

import (
	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v4"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/config"
)

// RegisterRoutes takes in an Echo router and registers routes onto it.
func RegisterRoutes(e *echo.Echo, cfg *config.Config, db *pg.DB, nonEnforceAuth echo.MiddlewareFunc) {
	sessionService := NewService(cfg, db)

	h := &handler{
		authService: sessionService,
	}

	e.POST("/sessions", h.create, nonEnforceAuth)
}
