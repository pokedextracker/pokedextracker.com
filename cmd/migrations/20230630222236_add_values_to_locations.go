package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec(`ALTER TABLE locations ADD COLUMN values TEXT[]`)
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("UPDATE locations SET values = regexp_split_to_array(locations.value, '(?!Let''s Go), (?!(Pikachu|Eevee))')")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE locations ALTER COLUMN values SET NOT NULL")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec(`ALTER TABLE locations DROP COLUMN values`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230630222236_add_values_to_locations", up, down, opts)
}
