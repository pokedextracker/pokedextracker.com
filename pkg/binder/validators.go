package binder

import (
	"regexp"

	"github.com/go-playground/validator/v10"
)

var (
	friendCode3DSRE    = regexp.MustCompile(`^\d{4}-\d{4}-\d{4}$`)
	friendCodeSwitchRE = regexp.MustCompile(`^SW-\d{4}-\d{4}-\d{4}$`)
	tokenRE            = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
)

func friendCode3DSValidator(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	if value == "" {
		// It's not the responsibility of this validator to enforce requirement.
		return true
	}
	return friendCode3DSRE.MatchString(value)
}

func friendCodeSwitchValidator(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	if value == "" {
		// It's not the responsibility of this validator to enforce requirement.
		return true
	}
	return friendCodeSwitchRE.MatchString(value)
}

func tokenValidator(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	if value == "" {
		// It's not the responsibility of this validator to enforce requirement.
		return true
	}
	return tokenRE.MatchString(value)
}
