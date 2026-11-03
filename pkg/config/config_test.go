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

// Everything staging and production can't start without, by environment variable.
var requiredSettings = []string{
	"DATABASE_HOST",
	"DATABASE_NAME",
	"DATABASE_PASSWORD",
	"DATABASE_SSL_MODE",
	"DATABASE_USER",
	"JWT_SECRET",
}

// setEnvironment starts from none of the settings, whatever the machine running
// the tests has set, and with the required ones if asked for.
func setEnvironment(t *testing.T, environment string, required bool) {
	t.Helper()
	t.Setenv(environmentENV, environment)
	for _, name := range []string{"BLOG_URL", "DATABASE_DEBUG", "DATABASE_PORT", "DATABASE_SSL_HOST", "PORT", "ROLLBAR_TOKEN", "UMAMI_URL", "UMAMI_WEBSITE_ID"} {
		t.Setenv(name, "")
	}
	for _, name := range requiredSettings {
		value := ""
		if required {
			value = "value of " + name
		}
		t.Setenv(name, value)
	}
}

//nolint:paralleltest // It sets environment variables, which t.Parallel() doesn't allow.
func TestEnvironments(t *testing.T) {
	for _, env := range []string{"development", "test", "staging", "production"} {
		setEnvironment(t, env, true)

		cfg, err := New()
		require.NoError(t, err)
		assert.Equal(t, env, cfg.Environment, "incorrect environment")
	}

	setEnvironment(t, "", false)
	cfg, err := New()
	require.NoError(t, err)
	assert.Equal(t, "development", cfg.Environment, "the default environment")
}

//nolint:paralleltest // It sets environment variables, which t.Parallel() doesn't allow.
func TestUnknownEnvironmentIsAnError(t *testing.T) {
	setEnvironment(t, "prod", true)

	_, err := New()

	require.ErrorContains(t, err, environmentENV)
}

//nolint:paralleltest // It sets environment variables, which t.Parallel() doesn't allow.
func TestEnvironmentDefaults(t *testing.T) {
	setEnvironment(t, "development", false)
	cfg, err := New()
	require.NoError(t, err)
	assert.Equal(t, 8647, cfg.Port)
	assert.Equal(t, "localhost", cfg.DatabaseHost)
	assert.Equal(t, "pokedex_tracker", cfg.DatabaseName)
	assert.Equal(t, 5432, cfg.DatabasePort)
	assert.Equal(t, "disable", cfg.DatabaseSSLMode)
	assert.Equal(t, []byte("s3cret"), cfg.JWTSecret)
	assert.Empty(t, cfg.BlogURL)

	setEnvironment(t, "test", false)
	cfg, err = New()
	require.NoError(t, err)
	assert.Equal(t, "pokedex_tracker_test", cfg.DatabaseName)

	setEnvironment(t, "staging", true)
	cfg, err = New()
	require.NoError(t, err)
	assert.Equal(t, []string{"https://staging.pokedextracker.com", "http://localhost:9898"}, cfg.CORSAllowedOrigins)
	assert.Empty(t, cfg.BlogURL, "staging has no blog")

	setEnvironment(t, "production", true)
	cfg, err = New()
	require.NoError(t, err)
	assert.Equal(t, []string{"https://pokedextracker.com"}, cfg.CORSAllowedOrigins)
	assert.Equal(t, "https://pokedextracker.mymidnight.blog", cfg.BlogURL)
}

// Not parallel: it sets environment variables.
func TestEnvironmentVariablesOverrideEveryEnvironment(t *testing.T) {
	for _, env := range []string{"development", "test", "staging", "production"} {
		t.Run(env, func(t *testing.T) {
			setEnvironment(t, env, true)
			t.Setenv("BLOG_URL", "https://blog.example.com")
			t.Setenv("DATABASE_DEBUG", "true")
			t.Setenv("DATABASE_PORT", "9876")
			t.Setenv("DATABASE_SSL_HOST", "ssl.example.com")
			t.Setenv("PORT", "1234")
			t.Setenv("ROLLBAR_TOKEN", "token")
			t.Setenv("UMAMI_URL", "https://umami.example.com")
			t.Setenv("UMAMI_WEBSITE_ID", "site")

			cfg, err := New()

			require.NoError(t, err)
			assert.Equal(t, "https://blog.example.com", cfg.BlogURL)
			assert.True(t, cfg.DatabaseDebug)
			assert.Equal(t, "value of DATABASE_HOST", cfg.DatabaseHost)
			assert.Equal(t, "value of DATABASE_NAME", cfg.DatabaseName)
			assert.Equal(t, "value of DATABASE_PASSWORD", cfg.DatabasePassword)
			assert.Equal(t, 9876, cfg.DatabasePort)
			assert.Equal(t, "ssl.example.com", cfg.DatabaseSSLHost)
			assert.Equal(t, "value of DATABASE_SSL_MODE", cfg.DatabaseSSLMode)
			assert.Equal(t, "value of DATABASE_USER", cfg.DatabaseUser)
			assert.Equal(t, []byte("value of JWT_SECRET"), cfg.JWTSecret)
			assert.Equal(t, 1234, cfg.Port)
			assert.Equal(t, "token", cfg.RollbarToken)
			assert.Equal(t, "https://umami.example.com", cfg.UmamiURL)
			assert.Equal(t, "site", cfg.UmamiWebsiteID)
		})
	}
}

// Not parallel: it sets environment variables.
func TestStagingAndProductionRequireTheirSettings(t *testing.T) {
	for _, env := range []string{"staging", "production"} {
		t.Run(env, func(t *testing.T) {
			setEnvironment(t, env, true)
			for _, name := range requiredSettings {
				t.Run(name, func(t *testing.T) {
					t.Setenv(name, "")

					_, err := New()

					require.ErrorContains(t, err, name+" is required")
				})
			}

			setEnvironment(t, env, false)
			_, err := New()
			for _, name := range requiredSettings {
				require.ErrorContains(t, err, name+" is required", "every missing setting is listed at once")
			}
		})
	}
}

// Not parallel: it sets environment variables.
func TestInvalidValuesAreErrorsThatDontPrintThem(t *testing.T) {
	cases := map[string]string{
		"PORT":           "not-a-port",
		"DATABASE_PORT":  "70000",
		"DATABASE_DEBUG": "maybe",
	}
	for name, value := range cases {
		t.Run(name, func(t *testing.T) {
			setEnvironment(t, "production", true)
			t.Setenv(name, value)

			_, err := New()

			require.ErrorContains(t, err, name)
			assert.NotContains(t, err.Error(), value)
		})
	}

	setEnvironment(t, "development", false)
	t.Setenv("PORT", "0")
	_, err := New()
	require.ErrorContains(t, err, "PORT", "a port has to be one the server can be reached on")
}
