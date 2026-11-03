package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/pkg/errors"
)

// Version will be set using a linker flag when we build for production.
var Version = ""

// Config contains the environment specific configuration values needed by the
// application.
type Config struct {
	BcryptCost                int
	BlogURL                   string
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
	RollbarClientToken        string
	RollbarToken              string
	UmamiURL                  string
	UmamiWebsiteID            string
	Version                   string
}

const environmentENV = "ENVIRONMENT"

// New returns the Config for the "ENVIRONMENT" environment variable: the
// defaults, then that environment's own, then any environment variables that
// are set, which win in every environment. A bad value or a missing setting is
// an error naming the variable, never its value, so a broken deploy stops
// before it serves anything.
func New() (*Config, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return nil, errors.WithStack(err)
	}

	cfg := &Config{
		BcryptCost:                10,
		DatabaseConnectRetryCount: 10,
		DatabaseConnectRetryDelay: 2 * time.Second,
		DatabasePort:              5432,
		Hostname:                  hostname,
		Port:                      8647,
		Version:                   Version,
	}

	// The frontend's Rollbar token, handed to it with index.html (see
	// server.frontendConfig). It's public: it's in every page anyway.
	cfg.RollbarClientToken = "19ffd96c890b422287ce3a06a917678e"

	switch os.Getenv(environmentENV) {
	case "development", "":
		loadDevelopmentConfig(cfg)
	case "test":
		loadTestConfig(cfg)
	case "staging":
		loadStagingConfig(cfg)
	case "production":
		loadProductionConfig(cfg)
	default:
		return nil, errors.Errorf("%s must be development, test, staging, or production", environmentENV)
	}

	problems := applyEnvironmentVariables(cfg)
	problems = append(problems, missingSettings(cfg)...)
	if len(problems) > 0 {
		return nil, errors.Errorf("invalid configuration: %s", strings.Join(problems, "; "))
	}

	return cfg, nil
}

// applyEnvironmentVariables overrides settings with the environment variables
// that are set, where empty counts as unset, and returns what's wrong with them.
func applyEnvironmentVariables(cfg *Config) []string {
	settings := []struct {
		name    string
		setting *string
	}{
		// Where /blog is forwarded, or empty for no blog.
		{"BLOG_URL", &cfg.BlogURL},
		{"DATABASE_HOST", &cfg.DatabaseHost},
		{"DATABASE_NAME", &cfg.DatabaseName},
		{"DATABASE_PASSWORD", &cfg.DatabasePassword},
		{"DATABASE_SSL_HOST", &cfg.DatabaseSSLHost},
		{"DATABASE_SSL_MODE", &cfg.DatabaseSSLMode},
		{"DATABASE_USER", &cfg.DatabaseUser},
		{"ROLLBAR_TOKEN", &cfg.RollbarToken},
		// Web analytics, sent to a self-hosted Umami through /stats (see
		// server.registerAnalytics). They're on only when both are set, which is
		// done outside this repository, so other copies of the site send nothing.
		{"UMAMI_URL", &cfg.UmamiURL},
		{"UMAMI_WEBSITE_ID", &cfg.UmamiWebsiteID},
	}
	for _, s := range settings {
		if value := os.Getenv(s.name); value != "" {
			*s.setting = value
		}
	}

	if value := os.Getenv("JWT_SECRET"); value != "" {
		cfg.JWTSecret = []byte(value)
	}

	var problems []string

	ports := []struct {
		name    string
		setting *int
	}{
		{"DATABASE_PORT", &cfg.DatabasePort},
		{"PORT", &cfg.Port},
	}
	for _, p := range ports {
		value := os.Getenv(p.name)
		if value == "" {
			continue
		}
		port, err := strconv.Atoi(value)
		if err != nil || port < 1 || port > 65535 {
			problems = append(problems, p.name+" must be a port number")
			continue
		}
		*p.setting = port
	}

	if value := os.Getenv("DATABASE_DEBUG"); value != "" {
		debug, err := strconv.ParseBool(value)
		if err != nil {
			problems = append(problems, "DATABASE_DEBUG must be true or false")
		}
		cfg.DatabaseDebug = debug
	}

	return problems
}

// missingSettings lists what staging and production can't run without. Without
// them the server would still start, signing logins with an empty key, or fail
// only once it first needs the database. Development and test have defaults.
func missingSettings(cfg *Config) []string {
	if cfg.Environment != "staging" && cfg.Environment != "production" {
		return nil
	}

	required := []struct {
		name string
		set  bool
	}{
		{"DATABASE_HOST", cfg.DatabaseHost != ""},
		{"DATABASE_NAME", cfg.DatabaseName != ""},
		{"DATABASE_PASSWORD", cfg.DatabasePassword != ""},
		{"DATABASE_SSL_MODE", cfg.DatabaseSSLMode != ""},
		{"DATABASE_USER", cfg.DatabaseUser != ""},
		{"JWT_SECRET", len(cfg.JWTSecret) > 0},
	}
	var missing []string
	for _, r := range required {
		if !r.set {
			missing = append(missing, r.name+" is required")
		}
	}
	return missing
}
