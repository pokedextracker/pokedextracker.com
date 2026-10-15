package errcodes

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestErrors(t *testing.T) {
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
		err := tt.err.(*Error)
		msg := err.Message
		assert.Equal(t, tt.httpCode, err.HTTPCode)
		assert.Equal(t, tt.msg, msg)
		assert.Equal(t, tt.code, err.Code)
	}
}
