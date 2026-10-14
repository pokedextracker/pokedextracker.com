package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew(t *testing.T) {
	cfg, err := New()
	require.NoError(t, err)
	assert.NotNil(t, cfg, "returned config shouldn't be nil")
}

func TestEnvironments(t *testing.T) {
	originalEnv := os.Getenv(environmentENV)
	defer func() {
		err := os.Setenv(environmentENV, originalEnv)
		require.NoError(t, err, "unexpected error restoring original environment")
		err = os.Setenv("PORT", "")
		require.NoError(t, err, "unexpected error clearing PORT env")
	}()

	envs := []string{"development", "staging", "production"}

	for _, env := range envs {
		err := os.Setenv(environmentENV, env)
		require.NoError(t, err, "unexpected error overwriting environment")

		cfg, err := New()
		require.NoError(t, err)
		assert.Equal(t, cfg.Environment, env, "incorrect environment")
	}

	err := os.Setenv(environmentENV, "development")
	require.NoError(t, err, "unexpected error overwriting environment")
	err = os.Setenv("PORT", "1234")
	require.NoError(t, err, "unexpected error setting PORT env")
	cfg, err := New()
	require.NoError(t, err)
	assert.Equal(t, 1234, cfg.Port)
}
