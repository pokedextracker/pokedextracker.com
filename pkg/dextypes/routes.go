package dextypes

import (
	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v4"
)

// RegisterRoutes takes in an Echo router and registers routes onto it.
func RegisterRoutes(e *echo.Echo, db *pg.DB, nonEnforceAuth echo.MiddlewareFunc) {
	dexTypeService := NewService(db)

	h := &handler{
		dexTypeService: dexTypeService,
	}

	e.GET("/dex-types", h.list, nonEnforceAuth)
}
