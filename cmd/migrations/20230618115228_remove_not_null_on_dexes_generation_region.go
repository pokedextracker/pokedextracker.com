package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec(`
			ALTER TABLE dexes
				ALTER COLUMN generation DROP NOT NULL,
				ALTER COLUMN region DROP NOT NULL
		`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec(`
			ALTER TABLE dexes
				ALTER COLUMN generation SET NOT NULL,
				ALTER COLUMN region SET NOT NULL
		`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230618115228_remove_not_null_on_dexes_generation_region", up, down, opts)
}
