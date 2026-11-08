package captures

import (
	"context"

	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v5"
	"github.com/pokedextracker/pokedextracker.com/pkg/auth"
	"github.com/pokedextracker/pokedextracker.com/pkg/dexes"
	"github.com/pokedextracker/pokedextracker.com/pkg/pokemon"
)

// RegisterRoutes registers routes onto an Echo route group. The writes need
// only a valid token (auth's tokenOnly), since their handlers check the dex's
// owner themselves. A route that allows access by the username in the URL
// needs auth's enforced middleware instead.
func RegisterRoutes(e *echo.Group, db *pg.DB, tokenOnlyAuth echo.MiddlewareFunc, nonEnforceAuth echo.MiddlewareFunc) {
	captureService := NewService(db)
	dexService := dexes.NewService(db)
	pokemonService := pokemon.NewService(db)

	h := &handler{
		captureService: captureService,
		dexService:     dexService,
		pokemonService: pokemonService,
		tokenUserExists: func(ctx context.Context, session *auth.Session) (bool, error) {
			return auth.TokenUserExists(ctx, db, session)
		},
	}

	e.POST("/captures", h.create, tokenOnlyAuth)
	e.GET("/users/:username/dexes/:slug/captures", h.list, nonEnforceAuth)
	e.DELETE("/captures", h.delete, tokenOnlyAuth)
}
