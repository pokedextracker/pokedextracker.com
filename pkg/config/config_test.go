package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew(t *testing.T) {
	t.Parallel()

	cfg, err := New()
	require.NoError(t, err)
	assert.NotNil(t, cfg, "returned config shouldn't be nil")
}

func TestEnvironments(t *testing.T) {
	for _, env := range []string{"development", "staging", "production"} {
		t.Setenv(environmentENV, env)

		cfg, err := New()
		require.NoError(t, err)
		assert.Equal(t, env, cfg.Environment, "incorrect environment")
	}

	t.Setenv(environmentENV, "development")
	t.Setenv("PORT", "1234")
	cfg, err := New()
	require.NoError(t, err)
	assert.Equal(t, 1234, cfg.Port)
}

func TestDatabaseOverrides(t *testing.T) {
	for _, env := range []string{"development", "test"} {
		t.Run(env, func(t *testing.T) {
			t.Setenv(environmentENV, env)

			t.Setenv("DATABASE_HOST", "")
			t.Setenv("DATABASE_NAME", "")
			cfg, err := New()
			require.NoError(t, err)
			assert.Equal(t, "localhost", cfg.DatabaseHost)
			assert.NotEmpty(t, cfg.DatabaseName)

			t.Setenv("DATABASE_HOST", "127.0.0.1")
			t.Setenv("DATABASE_NAME", "worktree_db")
			cfg, err = New()
			require.NoError(t, err)
			assert.Equal(t, "127.0.0.1", cfg.DatabaseHost)
			assert.Equal(t, "worktree_db", cfg.DatabaseName)
		})
	}
}
