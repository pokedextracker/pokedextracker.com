package games

import (
	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v5"
)

// RegisterRoutes registers routes onto an Echo route group.
func RegisterRoutes(e *echo.Group, db *pg.DB, nonEnforceAuth echo.MiddlewareFunc) {
	gameService := NewService(db)

	h := &handler{
		gameService: gameService,
	}

	e.GET("/games", h.list, nonEnforceAuth)
}
