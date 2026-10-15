package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec(`
			ALTER TABLE pokemon
				DROP COLUMN regionless,
				DROP COLUMN type1,
				DROP COLUMN type2,
				DROP COLUMN icon_url,
				DROP COLUMN avatar_url
		`); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec(`
			ALTER TABLE pokemon
				ALTER COLUMN x_location DROP NOT NULL,
				ALTER COLUMN y_location DROP NOT NULL,
				ALTER COLUMN or_location DROP NOT NULL,
				ALTER COLUMN as_location DROP NOT NULL
		`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		if _, err := db.Exec(`
			ALTER TABLE pokemon
				ADD COLUMN regionless BOOLEAN NOT NULL DEFAULT FALSE,
				ADD COLUMN type1 TEXT CHECK (type1 IN ('normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy')),
				ADD COLUMN type2 TEXT CHECK (type2 IN ('normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy')),
				ADD COLUMN icon_url VARCHAR(255),
				ADD COLUMN avatar_url VARCHAR(255)
		`); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec(`
			ALTER TABLE pokemon
				ALTER COLUMN x_location SET NOT NULL,
				ALTER COLUMN y_location SET NOT NULL,
				ALTER COLUMN or_location SET NOT NULL,
				ALTER COLUMN as_location SET NOT NULL
		`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230615110724_drop_unnecessary_columns_on_pokemon", up, down, opts)
}
