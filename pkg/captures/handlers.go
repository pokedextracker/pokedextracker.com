package captures

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/auth"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/dexes"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/errcodes"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/pokemon"
)

type handler struct {
	captureService *Service
	dexService     *dexes.Service
	pokemonService *pokemon.Service
}

func (h *handler) create(c echo.Context) error {
	ctx := c.Request().Context()
	session := auth.FromContext(c)

	params := createParams{}
	if err := c.Bind(&params); err != nil {
		return errors.WithStack(err)
	}

	dex, err := h.dexService.RetrieveDex(ctx, dexes.RetrieveDexOptions{
		ID: &params.Dex,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	// Validate that this user has permissions to mark captures for this dex.
	if dex.UserID != session.ID {
		return errcodes.Forbidden("marking captures for this dex")
	}

	mons, err := h.pokemonService.ListPokemon(ctx, pokemon.ListPokemonOptions{
		IDs: params.Pokemon,
	})
	if err != nil {
		return errors.WithStack(err)
	}
	if len(mons) != len(params.Pokemon) {
		// Some of the IDs that were passed in weren't valid IDs.
		return errcodes.NotFound("pokemon")
	}

	// Construct capture models that will be inserted.
	captures := make([]*Capture, 0, len(params.Pokemon))
	for _, id := range params.Pokemon {
		captures = append(captures, &Capture{
			DexID:     params.Dex,
			PokemonID: id,
			Captured:  true,
		})
	}

	err = h.captureService.CreateCaptures(ctx, captures)
	if err != nil {
		return errors.WithStack(err)
	}

	// Reload captures with correct models and columns loaded.
	captures, err = h.captureService.ListCaptures(ctx, ListCapturesOptions{
		DexID:      &dex.ID,
		PokemonIDs: params.Pokemon,
		DexTypeID:  &dex.DexTypeID,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	return errors.WithStack(c.JSON(http.StatusOK, captures))
}

func (h *handler) list(c echo.Context) error {
	ctx := c.Request().Context()

	username := c.Param("username")
	slug := c.Param("slug")

	dex, err := h.dexService.RetrieveDex(ctx, dexes.RetrieveDexOptions{
		Username:              &username,
		Slug:                  &slug,
		IncludeDexTypePokemon: true,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	trueCaptures, err := h.captureService.ListCaptures(ctx, ListCapturesOptions{
		DexID:     &dex.ID,
		DexTypeID: &dex.DexTypeID,
	})
	if err != nil {
		return errors.WithStack(err)
	}
	trueCapturesMap := map[int]*Capture{}
	for _, trueCapture := range trueCaptures {
		trueCapturesMap[trueCapture.PokemonID] = trueCapture
	}

	captures := make([]*Capture, 0, len(dex.DexType.Pokemon))
	for _, mon := range dex.DexType.Pokemon {
		if capture, ok := trueCapturesMap[mon.ID]; ok {
			// This capture is true, and we have the real model that we can add to our list.
			captures = append(captures, capture)
			continue
		}

		// This capture is false, so we need to create a stub of a capture to be displayed.
		captures = append(captures, &Capture{
			DexID:     dex.ID,
			PokemonID: mon.ID,
			Pokemon:   mon,
			Captured:  false,
		})
	}

	return errors.WithStack(c.JSON(http.StatusOK, captures))
}

func (h *handler) delete(c echo.Context) error {
	ctx := c.Request().Context()
	session := auth.FromContext(c)

	params := deleteParams{}
	if err := c.Bind(&params); err != nil {
		return errors.WithStack(err)
	}

	dex, err := h.dexService.RetrieveDex(ctx, dexes.RetrieveDexOptions{
		ID: &params.Dex,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	// Validate that this user has permissions to delete captures for this dex.
	if dex.UserID != session.ID {
		return errcodes.Forbidden("deleting captures for this dex")
	}

	err = h.captureService.DeleteCaptures(ctx, DeleteCapturesOptions{
		DexID:      params.Dex,
		PokemonIDs: params.Pokemon,
	})
	if err != nil {
		return errors.WithStack(err)
	}

	return errors.WithStack(c.JSONBlob(http.StatusOK, []byte(`{"deleted":true}`)))
}
