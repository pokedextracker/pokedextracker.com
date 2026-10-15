package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec(`
			CREATE TABLE captures (
				user_id INTEGER,
				pokemon_id INTEGER,
				captured BOOLEAN NOT NULL,
				date_created TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				date_modified TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

				PRIMARY KEY (user_id, pokemon_id)
			)
		`); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE captures ADD CONSTRAINT captures_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("CREATE INDEX captures_user_id_index ON captures (user_id)"); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec("ALTER TABLE captures ADD CONSTRAINT captures_pokemon_id_foreign FOREIGN KEY (pokemon_id) REFERENCES pokemon (national_id) ON DELETE CASCADE")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("DROP TABLE captures")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230610074520_create_captures_table", up, down, opts)
}
