package games

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
)

type handler struct {
	gameService *Service
}

func (h *handler) list(c echo.Context) error {
	ctx := c.Request().Context()

	games, err := h.gameService.ListGames(ctx)
	if err != nil {
		return errors.WithStack(err)
	}

	return errors.WithStack(c.JSON(http.StatusOK, games))
}
