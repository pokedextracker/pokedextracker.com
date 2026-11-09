package captures

import (
	"context"
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/pkg/errors"
	"github.com/pokedextracker/pokedextracker.com/pkg/auth"
	"github.com/pokedextracker/pokedextracker.com/pkg/dexes"
	"github.com/pokedextracker/pokedextracker.com/pkg/errcodes"
	"github.com/pokedextracker/pokedextracker.com/pkg/pokemon"
)

// dexRetriever is the part of dexes.Service the handlers use, so tests can
// fake it.
type dexRetriever interface {
	RetrieveDex(ctx context.Context, opts dexes.RetrieveDexOptions) (*dexes.Dex, error)
}

type handler struct {
	captureService *Service
	dexService     dexRetriever
	pokemonService *pokemon.Service
	// tokenUserExists is auth.TokenUserExists, which tests fake.
	tokenUserExists func(ctx context.Context, session *auth.Session) (bool, error)
}

// retrieveOwnDex loads a dex that belongs to the token's user: same id, and
// still the same username. The token isn't checked against the database
// before the handler (auth's tokenOnly), so this is the check that an account
// deleted after its token was signed, a username since taken by someone new,
// or a token from another database can't pass. It's one query, which matches
// the owner's username in a join.
func (h *handler) retrieveOwnDex(ctx context.Context, session *auth.Session, dexID int, action string) (*dexes.Dex, error) {
	dex, err := h.dexService.RetrieveDex(ctx, dexes.RetrieveDexOptions{
		ID:       &dexID,
		Username: &session.Username,
	})
	if err == nil && dex.UserID == session.ID {
		return dex, nil
	}
	if err != nil && !errors.Is(err, errcodes.NotFound("dex")) {
		return nil, errors.WithStack(err)
	}

	// It isn't this token's dex, which is rare, so the queries to say why
	// cost nothing in normal use: the account is gone, the dex is, or it's
	// someone else's.
	exists, err := h.tokenUserExists(ctx, session)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	if !exists {
		return nil, errcodes.DeletedUser()
	}
	_, err = h.dexService.RetrieveDex(ctx, dexes.RetrieveDexOptions{ID: &dexID})
	if err != nil {
		return nil, errors.WithStack(err)
	}
	return nil, errcodes.Forbidden(action)
}

func (h *handler) create(c *echo.Context) error {
	ctx := c.Request().Context()
	session := auth.FromContext(c)

	params := createParams{}
	if err := c.Bind(&params); err != nil {
		return errors.WithStack(err)
	}

	dex, err := h.retrieveOwnDex(ctx, session, params.Dex, "marking captures for this dex")
	if err != nil {
		return errors.WithStack(err)
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

func (h *handler) list(c *echo.Context) error {
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

func (h *handler) delete(c *echo.Context) error {
	ctx := c.Request().Context()
	session := auth.FromContext(c)

	params := deleteParams{}
	if err := c.Bind(&params); err != nil {
		return errors.WithStack(err)
	}

	_, err := h.retrieveOwnDex(ctx, session, params.Dex, "deleting captures for this dex")
	if err != nil {
		return errors.WithStack(err)
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
