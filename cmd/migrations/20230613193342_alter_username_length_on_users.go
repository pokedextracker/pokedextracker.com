package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(20)")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(255)")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230613193342_alter_username_length_on_users", up, down, opts)
}
