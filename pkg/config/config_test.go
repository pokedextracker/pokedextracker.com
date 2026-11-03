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

// requiredSettings is what staging and production can't start without.
var requiredSettings = map[string]string{
	"DATABASE_HOST":     "value of DATABASE_HOST",
	"DATABASE_NAME":     "value of DATABASE_NAME",
	"DATABASE_PASSWORD": "value of DATABASE_PASSWORD",
	"DATABASE_SSL_MODE": "require",
	"DATABASE_USER":     "value of DATABASE_USER",
	"JWT_SECRET":        "value of JWT_SECRET",
}

// setEnvironment picks an environment and clears every setting, whatever the
// machine running the tests has set.
func setEnvironment(t *testing.T, environment string) {
	t.Helper()
	t.Setenv(environmentENV, environment)
	for _, name := range []string{"BLOG_URL", "DATABASE_DEBUG", "DATABASE_PORT", "DATABASE_SSL_HOST", "PORT", "ROLLBAR_TOKEN", "UMAMI_URL", "UMAMI_WEBSITE_ID"} {
		t.Setenv(name, "")
	}
	for name := range requiredSettings {
		t.Setenv(name, "")
	}
}

func setRequiredSettings(t *testing.T) {
	t.Helper()
	for name, value := range requiredSettings {
		t.Setenv(name, value)
	}
}

//nolint:paralleltest // It sets environment variables, which t.Parallel() doesn't allow.
func TestEnvironments(t *testing.T) {
	for _, env := range []string{"development", "test", "staging", "production"} {
		setEnvironment(t, env)
		setRequiredSettings(t)

		cfg, err := New()
		require.NoError(t, err)
		assert.Equal(t, env, cfg.Environment, "incorrect environment")
	}

	setEnvironment(t, "")
	cfg, err := New()
	require.NoError(t, err)
	assert.Equal(t, "development", cfg.Environment, "the default environment")
}

//nolint:paralleltest // It sets environment variables, which t.Parallel() doesn't allow.
func TestUnknownEnvironmentIsAnError(t *testing.T) {
	setEnvironment(t, "prod")
	setRequiredSettings(t)

	_, err := New()

	require.ErrorContains(t, err, environmentENV)
}

//nolint:paralleltest // It sets environment variables, which t.Parallel() doesn't allow.
func TestEnvironmentDefaults(t *testing.T) {
	setEnvironment(t, "development")
	cfg, err := New()
	require.NoError(t, err)
	assert.Equal(t, 8647, cfg.Port)
	assert.Equal(t, "localhost", cfg.DatabaseHost)
	assert.Equal(t, "pokedex_tracker", cfg.DatabaseName)
	assert.Equal(t, 5432, cfg.DatabasePort)
	assert.Equal(t, "disable", cfg.DatabaseSSLMode)
	assert.Equal(t, []byte("s3cret"), cfg.JWTSecret)
	assert.Empty(t, cfg.BlogURL)

	setEnvironment(t, "test")
	cfg, err = New()
	require.NoError(t, err)
	assert.Equal(t, "pokedex_tracker_test", cfg.DatabaseName)

	setEnvironment(t, "staging")
	setRequiredSettings(t)
	cfg, err = New()
	require.NoError(t, err)
	assert.Equal(t, []string{"https://staging.pokedextracker.com", "http://localhost:9898"}, cfg.CORSAllowedOrigins)
	assert.Empty(t, cfg.BlogURL, "staging has no blog")

	setEnvironment(t, "production")
	setRequiredSettings(t)
	cfg, err = New()
	require.NoError(t, err)
	assert.Equal(t, []string{"https://pokedextracker.com"}, cfg.CORSAllowedOrigins)
	assert.Equal(t, "https://pokedextracker.mymidnight.blog", cfg.BlogURL)
}

// Not parallel: it sets environment variables.
func TestEnvironmentVariablesOverrideEveryEnvironment(t *testing.T) {
	for _, env := range []string{"development", "test", "staging", "production"} {
		t.Run(env, func(t *testing.T) {
			setEnvironment(t, env)
			setRequiredSettings(t)
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
			assert.Equal(t, "require", cfg.DatabaseSSLMode)
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
			setEnvironment(t, env)
			setRequiredSettings(t)
			for name := range requiredSettings {
				t.Run(name, func(t *testing.T) {
					t.Setenv(name, "")
					_, err := New()
					require.ErrorContains(t, err, name+" is required")

					t.Setenv(name, "   ")
					_, err = New()
					require.ErrorContains(t, err, name, "whitespace isn't a value")
				})
			}

			setEnvironment(t, env)
			_, err := New()
			for name := range requiredSettings {
				require.ErrorContains(t, err, name+" is required", "every missing setting is listed at once")
			}
		})
	}
}

// Not parallel: it sets environment variables.
func TestInvalidValuesAreErrorsThatDontPrintThem(t *testing.T) {
	cases := map[string]string{
		"BLOG_URL":          "http://user:hunter2@[bad",
		"DATABASE_DEBUG":    "maybe",
		"DATABASE_PORT":     "70000",
		"DATABASE_SSL_MODE": "disabled",
		"PORT":              "not-a-port",
		"UMAMI_URL":         "umami.example.com",
	}
	for name, value := range cases {
		t.Run(name, func(t *testing.T) {
			setEnvironment(t, "production")
			setRequiredSettings(t)
			t.Setenv(name, value)

			_, err := New()

			require.ErrorContains(t, err, name)
			assert.NotContains(t, err.Error(), value)
		})
	}

	// It only used to count when it was exactly "true", so this mustn't turn it on.
	setEnvironment(t, "development")
	t.Setenv("DATABASE_DEBUG", "1")
	_, err := New()
	require.ErrorContains(t, err, "DATABASE_DEBUG")

	setEnvironment(t, "development")
	t.Setenv("PORT", "0")
	_, err = New()
	require.ErrorContains(t, err, "PORT", "a port has to be one the server can be reached on")
}
