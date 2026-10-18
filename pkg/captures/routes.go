package captures

import (
	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v4"
	"github.com/pokedextracker/pokedextracker.com/pkg/dexes"
	"github.com/pokedextracker/pokedextracker.com/pkg/pokemon"
)

// RegisterRoutes registers routes onto an Echo route group.
func RegisterRoutes(e *echo.Group, db *pg.DB, enforceAuth echo.MiddlewareFunc, nonEnforceAuth echo.MiddlewareFunc) {
	captureService := NewService(db)
	dexService := dexes.NewService(db)
	pokemonService := pokemon.NewService(db)

	h := &handler{
		captureService: captureService,
		dexService:     dexService,
		pokemonService: pokemonService,
	}

	e.POST("/captures", h.create, enforceAuth)
	e.GET("/users/:username/dexes/:slug/captures", h.list, nonEnforceAuth)
	e.DELETE("/captures", h.delete, enforceAuth)
}
