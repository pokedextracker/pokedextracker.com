package config

import (
	"os"
)

func loadStagingConfig(cfg *Config) {
	cfg.CORSAllowedOrigins = []string{"https://staging.pokedextracker.com", "http://localhost:9898"}
	cfg.DatabaseHost = os.Getenv("DATABASE_HOST")
	cfg.DatabaseName = os.Getenv("DATABASE_NAME")
	cfg.DatabasePassword = os.Getenv("DATABASE_PASSWORD")
	cfg.DatabaseSSLMode = os.Getenv("DATABASE_SSL_MODE")
	cfg.DatabaseUser = os.Getenv("DATABASE_USER")
	cfg.Environment = "staging"
}
