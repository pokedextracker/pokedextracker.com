package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE captures ALTER COLUMN user_id DROP NOT NULL")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE captures ALTER COLUMN user_id SET NOT NULL")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230617133300_remove_not_null_on_captures_user_id", up, down, opts)
}
