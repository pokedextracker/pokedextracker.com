package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec(`
			CREATE TABLE pokemon (
				national_id INTEGER PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				kanto_id INTEGER,
				johto_id INTEGER,
				hoenn_id INTEGER,
				sinnoh_id INTEGER,
				unova_id INTEGER,
				central_kalos_id INTEGER,
				coastal_kalos_id INTEGER,
				mountain_kalos_id INTEGER,
				regionless BOOLEAN NOT NULL DEFAULT FALSE,
				type1 TEXT CHECK (type1 in ('normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy')) NOT NULL,
				type2 TEXT CHECK (type2 in ('normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy')),
				icon_url VARCHAR(255) NOT NULL,
				avatar_url VARCHAR(255) NOT NULL,
				x_location TEXT NOT NULL,
				y_location TEXT NOT NULL,
				or_location TEXT NOT NULL,
				as_location TEXT NOT NULL,
				date_created timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				date_modified timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec("CREATE INDEX pokemon_national_id_index ON pokemon (national_id)")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("DROP TABLE pokemon")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230610003859_create_pokemon_table", up, down, opts)
}
