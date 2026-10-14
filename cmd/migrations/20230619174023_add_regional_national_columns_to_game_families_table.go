package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec(`
			ALTER TABLE game_families
				ADD COLUMN regional_support BOOLEAN NOT NULL DEFAULT FALSE,
				ADD COLUMN national_support BOOLEAN NOT NULL DEFAULT FALSE
		`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec(`
			ALTER TABLE game_families
				DROP COLUMN regional_support,
				DROP COLUMN national_support
		`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230619174023_add_regional_national_columns_to_game_families_table", up, down, opts)
}
