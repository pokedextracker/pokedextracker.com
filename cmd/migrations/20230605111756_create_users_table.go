package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec(`
			CREATE TABLE users (
				id SERIAL PRIMARY KEY,
				username VARCHAR(255) NOT NULL,
				password VARCHAR(60) NOT NULL,
				friend_code VARCHAR(14),
				date_created TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				date_modified TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username)"); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec("CREATE INDEX users_username_index ON users (username)")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("DROP TABLE users")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230605111756_create_users_table", up, down, opts)
}
