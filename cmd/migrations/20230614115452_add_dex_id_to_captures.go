package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec("ALTER TABLE captures ADD COLUMN dex_id INTEGER"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE captures ADD CONSTRAINT captures_dex_id_foreign FOREIGN KEY (dex_id) REFERENCES dexes (id) ON DELETE CASCADE"); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec("CREATE INDEX captures_dex_id_index ON captures (dex_id)")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE captures DROP COLUMN dex_id")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230614115452_add_dex_id_to_captures", up, down, opts)
}
