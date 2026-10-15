package binder

import (
	"fmt"
	"reflect"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gorilla/schema"
	"github.com/segmentio/encoding/json"
)

const (
	email    = "email"
	gt       = "gt"
	gte      = "gte"
	gtfield  = "gtfield"
	ltfield  = "ltfield"
	max      = "max"
	min      = "min"
	ne       = "ne"
	oneof    = "oneof"
	required = "required"

	friendCode3DS    = "friend_code_3ds"
	friendCodeSwitch = "friend_code_switch"
	token            = "token"
)

var (
	timeType = reflect.TypeOf(time.Time{})
)

func formatUnmarshalTypeError(err *json.UnmarshalTypeError) string {
	// FIXME: this doesn't work well for incorrect map values, e.g. it will say
	// `"metadata" should be a string instead of a object` if you pass in
	// `{"metadata":{"foo":{"bar":"baz"}}}`.
	return fmt.Sprintf("%q should be of type %s", strings.Trim(err.Field, "."), err.Type)
}

func formatSchemaConversionError(err schema.ConversionError) string {
	return fmt.Sprintf("%q should be of type %s", err.Key, err.Type)
}

func formatValidationError(err validator.FieldError) string {
	field := err.Field()

	switch err.Tag() {
	case email:
		return fmt.Sprintf("%q is not a valid email", field)
	case gt:
		v := err.Param()
		if v == "" && err.Type() == timeType {
			v = "now"
		}
		return fmt.Sprintf("%q must be greater than %s", field, v)
	case gte:
		v := err.Param()
		if v == "" && err.Type() == timeType {
			v = "now"
		}
		return fmt.Sprintf("%q must be greater than or equal to %s", field, v)
	case gtfield:
		// FIXME: err.Param() will return the struct field, not the JSON version
		// e.g. EndTime, not end_time
		return fmt.Sprintf("%q must be greater than %s", field, err.Param())
	case ltfield:
		// FIXME: err.Param() will return the struct field, not the JSON version
		// e.g. EndTime, not end_time
		return fmt.Sprintf("%q must be less than %s", field, err.Param())
	case max:
		resource := "character"
		if err.Kind() == reflect.Slice {
			resource = "element"
		}

		if err.Param() != "1" {
			resource += "s"
		}

		return fmt.Sprintf("%q length must be less than or equal to %s %s", field, err.Param(), resource)
	case min:
		resource := "character"
		if err.Kind() == reflect.Slice {
			resource = "element"
		}

		if err.Param() != "1" {
			resource += "s"
		}

		return fmt.Sprintf("%q length must be greater than or equal to %s %s", field, err.Param(), resource)
	case ne:
		return fmt.Sprintf("%q can't be %q", field, err.Param())
	case oneof:
		valids := []string{}
		for _, p := range strings.Fields(err.Param()) {
			valids = append(valids, fmt.Sprintf("%q", p))
		}
		return fmt.Sprintf("%q must be one of the following: %s", field, strings.Join(valids, ", "))
	case required:
		return fmt.Sprintf("%q is required", field)
	case friendCode3DS:
		return fmt.Sprintf("%q must be a valid 3DS friend code", field)
	case friendCodeSwitch:
		return fmt.Sprintf("%q must be a valid Switch friend code", field)
	case token:
		return fmt.Sprintf("%q must only contain alpha-numeric and underscore characters", field)
	default:
		// these print statements aid in determining how to construct
		// the error messages for validation functions that haven't been
		// implemented yet
		fmt.Println("actual tag", err.ActualTag())
		fmt.Println("field", field)
		fmt.Println("param", err.Param())
		fmt.Println("struct field", err.StructField())
		fmt.Println("struct namspace", err.StructNamespace())
		fmt.Println("tag", err.Tag())
		fmt.Println("kind", err.Kind())
		fmt.Println("type", err.Type())

		return "NOT IMPLEMENTED YET"
	}
}
