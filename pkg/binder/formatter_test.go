package binder

import (
	"fmt"
	"reflect"
	"testing"

	ut "github.com/go-playground/universal-translator"
	"github.com/stretchr/testify/assert"
)

type mockFieldError struct {
	tag   string
	field string
	param string
}

func (e *mockFieldError) Error() string                    { return fmt.Sprintf("%s - %s - %s", e.tag, e.field, e.param) }
func (e *mockFieldError) Tag() string                      { return e.tag }
func (e *mockFieldError) ActualTag() string                { return e.tag }
func (e *mockFieldError) Namespace() string                { return "" }
func (e *mockFieldError) StructNamespace() string          { return "" }
func (e *mockFieldError) Field() string                    { return e.field }
func (e *mockFieldError) StructField() string              { return "" }
func (e *mockFieldError) Value() interface{}               { return "" }
func (e *mockFieldError) Param() string                    { return e.param }
func (e *mockFieldError) Kind() reflect.Kind               { return reflect.TypeOf("").Kind() }
func (e *mockFieldError) Type() reflect.Type               { return reflect.TypeOf("") }
func (e *mockFieldError) Translate(_ ut.Translator) string { return "" }

func TestFormatValidationError(t *testing.T) {
	cases := []struct {
		tag, param, msg string
	}{
		{email, "", `"multi_word" is not a valid email`},
		{gt, "0", `"multi_word" must be greater than 0`},
		{max, "20", `"multi_word" length must be less than or equal to 20 characters`},
		{max, "1", `"multi_word" length must be less than or equal to 1 character`},
		{min, "20", `"multi_word" length must be greater than or equal to 20 characters`},
		{min, "1", `"multi_word" length must be greater than or equal to 1 character`},
		{ne, "20", `"multi_word" can't be "20"`},
		{oneof, "one two three", `"multi_word" must be one of the following: "one", "two", "three"`},
		{required, "", `"multi_word" is required`},
		{"foo", "", "NOT IMPLEMENTED YET"},
	}

	for _, tt := range cases {
		err := mockFieldError{tt.tag, "multi_word", tt.param}
		msg := formatValidationError(&err)
		assert.Equal(t, tt.msg, msg)
	}
}
