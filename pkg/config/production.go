package config

func loadProductionConfig(cfg *Config) {
	cfg.CORSAllowedOrigins = []string{"https://pokedextracker.com"}
	cfg.Environment = "production"
	// The blog is hosted on Ghost and served from pokedextracker.com/blog.
	cfg.BlogURL = "https://pokedextracker.mymidnight.blog"
}
