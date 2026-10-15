package errcodes

import (
	"context"
	"net/http"

	"github.com/iancoleman/strcase"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"github.com/robinjoseph08/golib/echo/v4/middleware/logger"
	"github.com/robinjoseph08/golib/errutils"
	"github.com/rollbar/rollbar-go"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

// Handle is an Echo error handler that uses HTTP errors accordingly, and any
// generic error will be interpreted as an internal server error.
func (h *Handler) Handle(err error, c echo.Context) {
	if errutils.IsIgnorableErr(err) {
		logger.FromEchoContext(c).Warn("broken pipe")
		return
	}
	if errors.Is(err, context.Canceled) {
		// If the context was cancelled, it's probably because the client canceled the request, so we don't need to
		// error on it.
		logger.FromEchoContext(c).Warn("context canceled")
		return
	}
	if IsPGUserCancel(err) {
		// If the context was cancelled during a SQL query, so the query ended early. This is also probably because the
		// client canceled the request, so we don't need to error on it.
		logger.FromEchoContext(c).Warn("user canceled statement")
		return
	}

	httpCode, payload := h.generatePayload(c, err)

	// Internal server errors
	if httpCode == http.StatusInternalServerError {
		extra := map[string]interface{}{
			"request_id": logger.IDFromEchoContext(c),
		}
		// We can't import the auth package since it would create an import cycle.
		if userID, ok := c.Get("userID").(int); ok {
			extra["user_id"] = userID
		}
		rollbar.RequestErrorWithExtrasAndContext(c.Request().Context(), rollbar.ERR, c.Request(), errutils.Unwrap(err), extra)
		logger.FromEchoContext(c).Err(err).Error("server error")
	}

	if err := c.JSON(httpCode, payload); err != nil {
		logger.FromEchoContext(c).Err(errors.WithStack(err)).Error("error handler json error")
	}
}

func (h *Handler) generatePayload(_ echo.Context, err error) (int, map[string]interface{}) {
	code := ""
	msg := ""
	httpCode := http.StatusInternalServerError

	// Echo errors
	var he *echo.HTTPError
	if ok := errors.As(err, &he); ok {
		httpCode = he.Code
		msg = he.Message.(string)
		code = strcase.ToSnake(msg)
	}

	// Custom errors
	var e *Error
	if ok := errors.As(err, &e); ok {
		httpCode = e.HTTPCode
		code = e.Code
		msg = e.Message
	}

	// Internal server errors that aren't Echo errors or custom errors
	if httpCode == http.StatusInternalServerError && msg == "" {
		code = "internal_server_error"
		msg = "Internal Server Error"
	}

	return httpCode, map[string]interface{}{
		"error": map[string]interface{}{
			"code":        code,
			"message":     msg,
			"status_code": httpCode,
		},
	}
}
