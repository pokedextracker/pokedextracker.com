package config

import (
	"runtime"
)

func loadDevelopmentConfig(cfg *Config) {
	runtime.GOMAXPROCS(2)

	cfg.CORSAllowedOrigins = []string{"http://localhost:9898"}
	cfg.DatabaseHost = "localhost"
	cfg.DatabaseName = "pokedex_tracker"
	cfg.DatabaseSSLMode = "disable"
	cfg.DatabaseUser = "pokedex_tracker_admin"
	cfg.Environment = "development"
	cfg.JWTSecret = []byte("s3cret")
	cfg.Version = "development"
}
