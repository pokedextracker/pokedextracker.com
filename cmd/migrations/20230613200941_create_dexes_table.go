package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec(`
			CREATE TABLE dexes (
				id SERIAL PRIMARY KEY,
				user_id INTEGER NOT NULL,
				title TEXT NOT NULL,
				slug TEXT NOT NULL,
				shiny BOOLEAN NOT NULL,
				generation INTEGER NOT NULL,
				date_created TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				date_modified TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE dexes ADD CONSTRAINT dexes_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("CREATE INDEX dexes_user_id_index ON dexes (user_id)"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("CREATE INDEX dexes_slug_index ON dexes (slug)"); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec("ALTER TABLE dexes ADD CONSTRAINT dexes_user_id_slug_unique UNIQUE (user_id, slug)")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("DROP TABLE dexes")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230613200941_create_dexes_table", up, down, opts)
}
