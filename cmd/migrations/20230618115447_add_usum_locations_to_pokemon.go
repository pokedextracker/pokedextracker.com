package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec(`
			ALTER TABLE pokemon
				ADD COLUMN us_location TEXT,
				ADD COLUMN um_location TEXT
		`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec(`
			ALTER TABLE pokemon
				DROP COLUMN us_location,
				DROP COLUMN um_location
		`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230618115447_add_usum_locations_to_pokemon", up, down, opts)
}
