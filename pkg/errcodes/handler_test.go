package errcodes

import (
	"net/http"
	"testing"

	"github.com/getsentry/sentry-go"
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

func TestHandlerReportsOnlyServerErrors(t *testing.T) {
	t.Parallel()

	transport := &sentry.MockTransport{}
	client, err := sentry.NewClient(sentry.ClientOptions{
		Dsn:       "https://key@sentry.example.com/1",
		Transport: transport,
	})
	require.NoError(t, err)
	h := &Handler{hub: sentry.NewHub(client, sentry.NewScope())}

	c, _ := test.NewContext(t, nil)
	h.Handle(c, &Error{http.StatusTeapot, "foo", "code"})
	assert.Empty(t, transport.Events(), "errors the client caused aren't reported")

	c, _ = test.NewContext(t, nil)
	c.Set("userID", 12345)
	h.Handle(c, errors.WithStack(errors.New("boom")))

	events := transport.Events()
	require.Len(t, events, 1)
	event := events[0]
	assert.Equal(t, "12345", event.User.ID)
	assert.Contains(t, event.Tags, "request_id")
	require.NotNil(t, event.Request)
	require.NotEmpty(t, event.Exception)
	assert.Equal(t, "boom", event.Exception[len(event.Exception)-1].Value)
	assert.NotNil(t, event.Exception[len(event.Exception)-1].Stacktrace, "the error's own stack trace is kept")
}
