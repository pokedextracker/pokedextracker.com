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
    			DROP COLUMN x_location,
    			DROP COLUMN y_location,
    			DROP COLUMN or_location,
    			DROP COLUMN as_location,
    			DROP COLUMN sun_location,
    			DROP COLUMN moon_location,
    			DROP COLUMN us_location,
    			DROP COLUMN um_location
		`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec(`
			ALTER TABLE pokemon
    			ADD COLUMN x_location TEXT,
    			ADD COLUMN y_location TEXT,
    			ADD COLUMN or_location TEXT,
    			ADD COLUMN as_location TEXT,
    			ADD COLUMN sun_location TEXT,
    			ADD COLUMN moon_location TEXT,
    			ADD COLUMN us_location TEXT,
    			ADD COLUMN um_location TEXT
		`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230619175954_drop_individual_location_columns", up, down, opts)
}
