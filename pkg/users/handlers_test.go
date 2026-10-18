package users

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/pokedextracker/pokedextracker.com/pkg/binder"
	"github.com/pokedextracker/pokedextracker.com/pkg/errcodes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateRequiresASlug(t *testing.T) {
	b, err := binder.New()
	require.NoError(t, err)
	e := echo.New()
	e.Binder = b

	cases := map[string]string{
		"missing":    ``,
		"empty":      `"slug": "",`,
		"whitespace": `"slug": "   ",`,
	}
	for name, slug := range cases {
		t.Run(name, func(t *testing.T) {
			body := `{` + slug + `"username": "ash", "password": "pikachu-pw", "title": "!!!", "shiny": false, "game": "legends_za", "dex_type": 23}`
			req := httptest.NewRequest(http.MethodPost, "/users", strings.NewReader(body))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			c := e.NewContext(req, httptest.NewRecorder())

			// The check comes before anything touches the database, so the
			// handler needs no services. Without the check, it panics on them.
			h := &handler{}
			assert.Equal(t, errcodes.EmptySlug(), h.create(c))
		})
	}
}
