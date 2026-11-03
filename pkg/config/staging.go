package config

func loadStagingConfig(cfg *Config) {
	cfg.CORSAllowedOrigins = []string{"https://staging.pokedextracker.com", "http://localhost:9898"}
	cfg.Environment = "staging"
}
