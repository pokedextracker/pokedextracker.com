package devtool

import (
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The frontend's API types are generated from the models. tygo makes every
// pointer optional, which is only right for omitempty ones, so any other pointer
// needs a tstype tag saying how the API sends it (see tygo.yaml).
func TestModelPointersSayHowTheAPISendsThem(t *testing.T) {
	t.Parallel()

	paths, err := filepath.Glob("../../pkg/*/models.go")
	require.NoError(t, err)
	require.NotEmpty(t, paths)

	for _, path := range paths {
		file, err := parser.ParseFile(token.NewFileSet(), path, nil, 0)
		require.NoError(t, err)
		ast.Inspect(file, func(node ast.Node) bool {
			if model, ok := node.(*ast.StructType); ok {
				for _, field := range model.Fields.List {
					assert.False(t, needsTSTypeTag(field), "%s: %v needs a tstype tag", path, field.Names)
				}
			}
			return true
		})
	}
}

// needsTSTypeTag reports whether the API sends a field holding a pointer, with
// nothing to tell tygo how.
func needsTSTypeTag(field *ast.Field) bool {
	var tag reflect.StructTag
	if field.Tag != nil {
		tag = reflect.StructTag(strings.Trim(field.Tag.Value, "`"))
	}
	name, options, _ := strings.Cut(tag.Get("json"), ",")
	if name == "-" || tag.Get("tstype") != "" {
		return false
	}
	if _, isPointer := field.Type.(*ast.StarExpr); isPointer && strings.Contains(options, "omitempty") {
		return false
	}
	holdsPointer := false
	ast.Inspect(field.Type, func(node ast.Node) bool {
		if _, ok := node.(*ast.StarExpr); ok {
			holdsPointer = true
		}
		return true
	})
	return holdsPointer
}
