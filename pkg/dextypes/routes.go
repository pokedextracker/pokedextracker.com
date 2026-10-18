package dextypes

import (
	"github.com/go-pg/pg/v10"
	"github.com/labstack/echo/v4"
)

// RegisterRoutes registers routes onto an Echo route group.
func RegisterRoutes(e *echo.Group, db *pg.DB, nonEnforceAuth echo.MiddlewareFunc) {
	dexTypeService := NewService(db)

	h := &handler{
		dexTypeService: dexTypeService,
	}

	e.GET("/dex-types", h.list, nonEnforceAuth)
}
