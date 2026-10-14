package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec(`
			CREATE TABLE game_families (
				id TEXT PRIMARY KEY,
				generation INTEGER NOT NULL,
				regional_total INTEGER NOT NULL,
				national_total INTEGER NOT NULL,
				"order" INTEGER NOT NULL,
				published BOOLEAN NOT NULL DEFAULT FALSE
			)
		`); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec(`ALTER TABLE game_families ADD CONSTRAINT game_families_order_unique UNIQUE ("order")`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("DROP TABLE game_families")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230617134032_create_game_families_table", up, down, opts)
}
