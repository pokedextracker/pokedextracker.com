package errcodes

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestErrors(t *testing.T) {
	t.Parallel()

	cases := []struct {
		err      error
		httpCode int
		msg      string
		code     string
	}{
		{Forbidden("Foo"), http.StatusForbidden, "Foo is not allowed", "forbidden"},
		{NotFound("Foo"), http.StatusNotFound, "Foo not found", "not_found"},
	}

	for _, tt := range cases {
		var err *Error
		require.ErrorAs(t, tt.err, &err)
		msg := err.Message
		assert.Equal(t, tt.httpCode, err.HTTPCode)
		assert.Equal(t, tt.msg, msg)
		assert.Equal(t, tt.code, err.Code)
	}
}
