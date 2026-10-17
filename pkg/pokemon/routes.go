package pokemon

import (
	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v4"
	"github.com/pokedextracker/pokedextracker.com/pkg/dextypes"
)

// RegisterRoutes registers routes onto an Echo route group.
func RegisterRoutes(e *echo.Group, db *pg.DB, nonEnforceAuth echo.MiddlewareFunc) {
	dexTypeService := dextypes.NewService(db)
	pokemonService := NewService(db)

	h := &handler{
		dexTypeService: dexTypeService,
		pokemonService: pokemonService,
	}

	e.GET("/pokemon/:id", h.retrieve, nonEnforceAuth)
}
