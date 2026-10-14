package dexes

import (
	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v4"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/dextypes"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/games"
)

// RegisterRoutes takes in an Echo router and registers routes onto it.
func RegisterRoutes(e *echo.Echo, db *pg.DB, enforceAuth echo.MiddlewareFunc, nonEnforceAuth echo.MiddlewareFunc) {
	dexService := NewService(db)
	dexTypeService := dextypes.NewService(db)
	gameService := games.NewService(db)

	h := &handler{
		dexService:     dexService,
		dexTypeService: dexTypeService,
		gameService:    gameService,
	}

	e.POST("/users/:username/dexes", h.create, enforceAuth)
	e.GET("/users/:username/dexes/:slug", h.retrieve, nonEnforceAuth)
	e.POST("/users/:username/dexes/:slug", h.update, enforceAuth)
	e.DELETE("/users/:username/dexes/:slug", h.delete, enforceAuth)
}
