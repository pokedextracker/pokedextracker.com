package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec(`ALTER TABLE dex_types ADD COLUMN description TEXT`)
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec(`ALTER TABLE dex_types ADD COLUMN base_dex_type_id INTEGER REFERENCES dex_types (id)`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec(`ALTER TABLE dex_types DROP COLUMN base_dex_type_id`)
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec(`ALTER TABLE dex_types DROP COLUMN description`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20231030211430_add_description_to_dex_types", up, down, opts)
}
