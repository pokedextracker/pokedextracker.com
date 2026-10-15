package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec("UPDATE dexes SET region = ? WHERE generation = ?", "national", 6); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("UPDATE dexes SET region = ? WHERE generation = ?", "alola", 7); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec("ALTER TABLE dexes ALTER COLUMN region SET NOT NULL")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE dexes ALTER COLUMN region DROP NOT NULL")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230615162542_backfill_dexes_region", up, down, opts)
}
