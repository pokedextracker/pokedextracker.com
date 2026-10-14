package pokemon

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/dextypes"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/errcodes"
)

type handler struct {
	dexTypeService *dextypes.Service
	pokemonService *Service
}

func (h *handler) retrieve(c echo.Context) error {
	ctx := c.Request().Context()

	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		return errcodes.ValidationError("id must be an integer")
	}

	params := retrieveParams{}
	if err := c.Bind(&params); err != nil {
		return errors.WithStack(err)
	}

	dexType, err := h.dexTypeService.RetrieveDexType(ctx, dextypes.RetrieveDexTypeOptions{
		ID:                &params.DexType,
		IncludeGameFamily: true,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	pokemon, err := h.pokemonService.RetrievePokemon(ctx, RetrievePokemonOptions{
		ID:      &id,
		DexType: dexType,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	return errors.WithStack(c.JSON(http.StatusOK, pokemon))
}
