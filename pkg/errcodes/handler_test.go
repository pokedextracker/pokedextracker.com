package errcodes

import (
	"net/http"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"github.com/robinjoseph08/golib/echo/v4/test"
	"github.com/stretchr/testify/assert"
)

func TestHandler(t *testing.T) {
	h := NewHandler()

	c, rr := test.NewContext(t, nil)
	err := errors.New("foo")
	h.Handle(err, c)
	assert.Equal(t, http.StatusInternalServerError, rr.Code, "expected generic errors to be 500s")
	assert.Contains(t, rr.Body.String(), "Internal Server Error", "expected generic errors to have the correct message")

	c, rr = test.NewContext(t, nil)
	err = echo.NewHTTPError(http.StatusTeapot, "foo")
	h.Handle(err, c)
	assert.Equal(t, http.StatusTeapot, rr.Code, "expected HTTP errors to be correct")
	assert.Contains(t, rr.Body.String(), "foo", "expected HTTP errors to have the correct message")

	c, rr = test.NewContext(t, nil)
	err = &Error{http.StatusTeapot, "foo", "code"}
	h.Handle(err, c)
	assert.Equal(t, http.StatusTeapot, rr.Code, "expected HTTP errors to be correct")
	assert.Contains(t, rr.Body.String(), "foo", "expected HTTP errors to have the correct message")
}
