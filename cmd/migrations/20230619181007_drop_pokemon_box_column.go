package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec(`ALTER TABLE pokemon DROP COLUMN box`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec(`ALTER TABLE pokemon ADD COLUMN box TEXT`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230619181007_drop_pokemon_box_column", up, down, opts)
}
