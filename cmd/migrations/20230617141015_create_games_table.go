package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec(`
			CREATE TABLE games (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				game_family_id TEXT NOT NULL,
				"order" INTEGER NOT NULL
			)
		`); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE games ADD CONSTRAINT games_game_family_id_foreign FOREIGN KEY (game_family_id) REFERENCES game_families (id)"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("CREATE INDEX games_game_family_id_index ON games (game_family_id)"); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec(`ALTER TABLE games ADD CONSTRAINT games_order_unique UNIQUE ("order")`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("DROP TABLE games")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230617141015_create_games_table", up, down, opts)
}
