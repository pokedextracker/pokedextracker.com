package dextypes

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
)

type handler struct {
	dexTypeService *Service
}

func (h *handler) list(c echo.Context) error {
	ctx := c.Request().Context()

	dexTypes, err := h.dexTypeService.ListDexTypes(ctx)
	if err != nil {
		return errors.WithStack(err)
	}

	return errors.WithStack(c.JSON(http.StatusOK, dexTypes))
}
