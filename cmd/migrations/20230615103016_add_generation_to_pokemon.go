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
				ADD COLUMN generation INTEGER,
				ADD COLUMN sun_location TEXT,
				ADD COLUMN moon_location TEXT
		`); err != nil {
			return errors.WithStack(err)
		}

		update := "UPDATE pokemon SET generation = ? WHERE national_id BETWEEN ? AND ?"
		params := []struct {
			generation, start, end int
		}{
			{1, 1, 151},
			{2, 152, 251},
			{3, 252, 386},
			{4, 387, 493},
			{5, 494, 649},
			{6, 650, 721},
		}
		for _, p := range params {
			if _, err := db.Exec(update, p.generation, p.start, p.end); err != nil {
				return errors.WithStack(err)
			}
		}

		_, err := db.Exec("ALTER TABLE pokemon ALTER COLUMN generation SET NOT NULL")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec(`
			ALTER TABLE pokemon
				DROP COLUMN generation,
				DROP COLUMN sun_location,
				DROP COLUMN moon_location
		`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230615103016_add_generation_to_pokemon", up, down, opts)
}
