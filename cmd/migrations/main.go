package main

import (
	"os"

	"github.com/pokedextracker/api.pokedextracker.com/pkg/config"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/database"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
	"github.com/robinjoseph08/golib/logger"
)

const directory = "./cmd/migrations"

func main() {
	log := logger.New()

	cfg, err := config.New()
	if err != nil {
		log.Err(err).Fatal("config error")
	}
	db, err := database.New("migrations", cfg)
	if err != nil {
		log.Err(err).Fatal("database error")
	}

	err = migrations.Run(db, directory, os.Args)
	if err != nil {
		log.Err(err).Fatal("migration error")
	}
}
