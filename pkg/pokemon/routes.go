package pokemon

import (
	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v4"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/dextypes"
)

// RegisterRoutes takes in an Echo router and registers routes onto it.
func RegisterRoutes(e *echo.Echo, db *pg.DB, nonEnforceAuth echo.MiddlewareFunc) {
	dexTypeService := dextypes.NewService(db)
	pokemonService := NewService(db)

	h := &handler{
		dexTypeService: dexTypeService,
		pokemonService: pokemonService,
	}

	e.GET("/pokemon/:id", h.retrieve, nonEnforceAuth)
}
