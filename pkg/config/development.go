package config

import (
	"os"
	"runtime"
	"strconv"
)

func loadDevelopmentConfig(cfg *Config) {
	runtime.GOMAXPROCS(2)

	port, err := strconv.Atoi(os.Getenv("PORT"))
	if err == nil {
		cfg.Port = port
	}

	cfg.CORSAllowedOrigins = []string{"http://localhost:9898"}
	cfg.DatabaseHost = "localhost"
	cfg.DatabaseName = "pokedex_tracker"
	cfg.DatabaseSSLMode = "disable"
	cfg.DatabaseUser = "pokedex_tracker_admin"
	cfg.Environment = "development"
	cfg.JWTSecret = []byte("s3cret")
	cfg.Version = "development"
}
