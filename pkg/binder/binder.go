package binder

import (
	"encoding/json"
	"net/http"
	"net/url"
	"reflect"
	"regexp"
	"strings"

	"github.com/creasty/defaults"
	"github.com/go-playground/mold/v4"
	"github.com/go-playground/mold/v4/modifiers"
	"github.com/go-playground/validator/v10"
	"github.com/gorilla/schema"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/errcodes"
	"github.com/robinjoseph08/golib/echo/v4/middleware/logger"
)

var unknownFieldsRE = regexp.MustCompile(`^json: unknown field "(.*)"$`)

// Binder is a custom struct that implements the Echo Binder interface. It binds
// to a struct, uses mold to clean up the params, and validator to validate
// them.
type Binder struct {
	queryDecoder *schema.Decoder
	formDecoder  *schema.Decoder
	conform      *mold.Transformer
	validate     *validator.Validate
}

// New initializes a new Binder instance with the appropriate validation
// functions registered.
func New() (*Binder, error) {
	queryDecoder := schema.NewDecoder()
	queryDecoder.SetAliasTag("query")
	formDecoder := schema.NewDecoder()
	formDecoder.SetAliasTag("form")
	conform := modifiers.New()
	validate := validator.New()
	validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})
	_ = validate.RegisterValidation(friendCode3DS, friendCode3DSValidator)
	_ = validate.RegisterValidation(friendCodeSwitch, friendCodeSwitchValidator)
	_ = validate.RegisterValidation(token, tokenValidator)

	return &Binder{queryDecoder, formDecoder, conform, validate}, nil
}

// Bind binds, modifies, and validates payloads against the given struct.
func (b *Binder) Bind(i interface{}, c echo.Context) error {
	req := c.Request()
	log := logger.FromEchoContext(c)

	disallowEmptyBody := true
	if disallow, ok := c.Get("disallow_empty_body").(bool); ok {
		disallowEmptyBody = disallow
	}

	if req.ContentLength > 0 {
		// request has a body
		ctype := req.Header.Get(echo.HeaderContentType)
		switch {
		// allow application/json
		case strings.HasPrefix(ctype, echo.MIMEApplicationJSON):
			// body, err := ioutil.ReadAll(req.Body)
			// if err != nil {
			// 	return err
			// }
			// fmt.Println(string(body))
			// req.Body = ioutil.NopCloser(bytes.NewReader(body))
			dec := json.NewDecoder(req.Body)
			disallowUnknownFields := true
			if disallow, ok := c.Get("disallow_unknown_fields").(bool); ok {
				disallowUnknownFields = disallow
			}
			if disallowUnknownFields {
				dec.DisallowUnknownFields()
			}
			defer req.Body.Close()
			if err := dec.Decode(i); err != nil {
				// return better error message when there are unknown fields
				if matches := unknownFieldsRE.FindAllStringSubmatch(err.Error(), -1); len(matches) > 0 && len(matches[0]) > 1 {
					return errcodes.UnknownParameter(matches[0][1])
				}

				// return better error message on type errors
				if err, ok := err.(*json.UnmarshalTypeError); ok {
					msg := formatUnmarshalTypeError(err)
					return errcodes.ValidationTypeError(msg)
				}

				log.Err(err).Error("unknown json decode error")

				return errcodes.MalformedPayload()
			}
		case strings.HasPrefix(ctype, echo.MIMEApplicationForm), strings.HasPrefix(ctype, echo.MIMEMultipartForm):
			params, err := c.FormParams()
			if err != nil {
				return errcodes.MalformedPayload()
			}
			if err := b.decodeQuery(i, params, b.formDecoder); err != nil {
				return errors.WithStack(err)
			}
			form, err := c.MultipartForm()
			if err != nil {
				return errors.WithStack(err)
			}
			// This only supports putting the files in a FormFiles field. It's
			// not the most flexible, but it works for now.
			field := reflect.ValueOf(i).Elem().FieldByName("FormFiles")
			mapMade := false
			if field.IsValid() && field.CanSet() {
				for key, headers := range form.File {
					// only pull the first file
					if len(headers) > 0 {
						if !mapMade {
							field.Set(reflect.MakeMap(field.Type()))
							mapMade = true
						}
						field.SetMapIndex(reflect.ValueOf(key), reflect.ValueOf(headers[0]))
					}
				}
			}
		default:
			return errcodes.UnsupportedMediaType()
		}
	} else {
		// request doesn't have a body
		if req.Method == http.MethodGet || req.Method == http.MethodDelete {
			if err := b.decodeQuery(i, c.QueryParams(), b.queryDecoder); err != nil {
				return errors.WithStack(err)
			}
		} else if disallowEmptyBody {
			return errcodes.EmptyRequestBody()
		}
	}

	if err := b.conform.Struct(req.Context(), i); err != nil {
		return errors.WithStack(err)
	}

	if err := defaults.Set(i); err != nil {
		return errors.WithStack(err)
	}

	if err := b.validate.Struct(i); err != nil {
		errs := err.(validator.ValidationErrors)
		msg := formatValidationError(errs[0])
		return errcodes.ValidationError(msg)
	}
	return nil
}

func (b *Binder) decodeQuery(i interface{}, params url.Values, decoder *schema.Decoder) error {
	if err := decoder.Decode(i, params); err != nil {
		if errs, ok := err.(schema.MultiError); ok {
			var err error
			for _, err = range errs {
				break
			}

			if err, ok := err.(schema.ConversionError); ok {
				msg := formatSchemaConversionError(err)
				return errcodes.ValidationTypeError(msg)
			}
			if err, ok := err.(schema.UnknownKeyError); ok {
				return errcodes.UnknownParameter(err.Key)
			}

			return errors.WithStack(err)
		}
		return errors.WithStack(err)
	}
	return nil
}
