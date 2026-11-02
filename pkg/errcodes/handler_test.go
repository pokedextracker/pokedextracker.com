package errcodes

import (
	"net/http"
	"testing"

	"github.com/labstack/echo/v5"
	"github.com/pkg/errors"
	"github.com/robinjoseph08/golib/echo/v5/test"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHandler(t *testing.T) {
	t.Parallel()

	h := NewHandler()

	c, rr := test.NewContext(t, nil)
	err := errors.New("foo")
	h.Handle(c, err)
	assert.Equal(t, http.StatusInternalServerError, rr.Code, "expected generic errors to be 500s")
	assert.Contains(t, rr.Body.String(), "Internal Server Error", "expected generic errors to have the correct message")

	c, rr = test.NewContext(t, nil)
	err = echo.NewHTTPError(http.StatusTeapot, "foo")
	h.Handle(c, err)
	assert.Equal(t, http.StatusTeapot, rr.Code, "expected HTTP errors to be correct")
	assert.Contains(t, rr.Body.String(), "foo", "expected HTTP errors to have the correct message")

	c, rr = test.NewContext(t, nil)
	err = &Error{http.StatusTeapot, "foo", "code"}
	h.Handle(c, err)
	assert.Equal(t, http.StatusTeapot, rr.Code, "expected HTTP errors to be correct")
	assert.Contains(t, rr.Body.String(), "foo", "expected HTTP errors to have the correct message")
}

// Echo's own errors, like the router's for a method a route doesn't have, carry
// only a status code.
func TestHandlerEchoSentinelErrors(t *testing.T) {
	t.Parallel()

	h := NewHandler()
	c, rr := test.NewContext(t, nil)
	h.Handle(c, errors.WithStack(echo.ErrMethodNotAllowed))

	assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	assert.JSONEq(t, `{"error":{"code":"method_not_allowed","message":"Method Not Allowed","status_code":405}}`, rr.Body.String())
}

func TestHandlerLeavesAStartedResponseAlone(t *testing.T) {
	t.Parallel()

	h := NewHandler()
	c, rr := test.NewContext(t, nil)
	require.NoError(t, c.String(http.StatusOK, "partial"))
	h.Handle(c, errors.New("foo"))

	assert.Equal(t, "partial", rr.Body.String())
}
