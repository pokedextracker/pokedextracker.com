package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE users ADD COLUMN referrer TEXT")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE users DROP COLUMN referrer")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230613200710_add_referrer_to_users", up, down, opts)
}
