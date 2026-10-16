package config

import (
	"os"
	"strconv"
	"time"

	"github.com/pkg/errors"
)

// Version will be set using a linker flag when we build for production.
var Version = ""

// Config contains the environment specific configuration values needed by the
// application.
type Config struct {
	BcryptCost                int
	CORSAllowedOrigins        []string
	DatabaseConnectRetryCount int
	DatabaseConnectRetryDelay time.Duration
	DatabaseDebug             bool
	DatabaseHost              string
	DatabaseName              string
	DatabasePassword          string
	DatabasePort              int
	DatabaseSSLHost           string
	DatabaseSSLMode           string
	DatabaseUser              string
	Environment               string
	Hostname                  string
	JWTSecret                 []byte
	Port                      int
	RollbarToken              string
	Version                   string
}

const environmentENV = "ENVIRONMENT"

// envOrDefault returns the environment variable's value, or fallback when it's
// unset or empty. The development and test configs use it so the dev launcher
// can point each worktree at its own database.
func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// New returns an instance of Config based on the "ENVIRONMENT" environment
// variable.
func New() (*Config, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return nil, errors.WithStack(err)
	}

	databasePort := 5432
	if os.Getenv("DATABASE_PORT") != "" {
		databasePort, err = strconv.Atoi(os.Getenv("DATABASE_PORT"))
		if err != nil {
			return nil, errors.WithStack(err)
		}
	}

	cfg := &Config{
		BcryptCost:                10,
		DatabaseConnectRetryCount: 10,
		DatabaseConnectRetryDelay: 2 * time.Second,
		DatabaseDebug:             os.Getenv("DATABASE_DEBUG") == "true",
		DatabasePort:              databasePort,
		DatabaseSSLHost:           os.Getenv("DATABASE_SSL_HOST"),
		Hostname:                  hostname,
		JWTSecret:                 []byte(os.Getenv("JWT_SECRET")),
		Port:                      8647,
		RollbarToken:              os.Getenv("ROLLBAR_TOKEN"),
		Version:                   Version,
	}

	switch os.Getenv(environmentENV) {
	case "development", "":
		loadDevelopmentConfig(cfg)
	case "test":
		loadTestConfig(cfg)
	case "staging":
		loadStagingConfig(cfg)
	case "production":
		loadProductionConfig(cfg)
	}

	return cfg, nil
}
