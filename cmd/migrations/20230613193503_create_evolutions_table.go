package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec("ALTER TABLE pokemon ADD COLUMN evolution_family_id INTEGER"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("CREATE INDEX pokemon_evolution_family_id_index ON pokemon (evolution_family_id)"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec(`
			CREATE TABLE evolutions (
				evolving_pokemon_id INTEGER,
				evolved_pokemon_id INTEGER,
				evolution_family_id INTEGER NOT NULL,
				stage INTEGER NOT NULL,
				trigger TEXT CHECK (trigger IN ('breed', 'level', 'stone', 'trade')) NOT NULL,
				level INTEGER,
				stone TEXT CHECK (stone IN ('fire', 'water', 'thunder', 'leaf', 'moon', 'sun', 'shiny', 'dusk', 'dawn')),
				held_item VARCHAR(255),
				notes TEXT,
				date_created TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				date_modified TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

				PRIMARY KEY (evolving_pokemon_id, evolved_pokemon_id)
			)
		`); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions ADD CONSTRAINT evolutions_evolving_pokemon_id_foreign FOREIGN KEY (evolving_pokemon_id) REFERENCES pokemon (national_id)"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions ADD CONSTRAINT evolutions_evolved_pokemon_id_foreign FOREIGN KEY (evolved_pokemon_id) REFERENCES pokemon (national_id)"); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec("CREATE INDEX evolutions_evolution_family_id_index ON evolutions (evolution_family_id)")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("DROP TABLE evolutions")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE pokemon DROP COLUMN evolution_family_id")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230613193503_create_evolutions_table", up, down, opts)
}
