package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE pokemon ADD COLUMN alola_id INTEGER")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE pokemon DROP COLUMN alola_id")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230615160540_add_alola_id_to_pokemon", up, down, opts)
}
