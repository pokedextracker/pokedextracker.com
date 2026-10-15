package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec(`
			ALTER TABLE dexes
				ADD COLUMN game_id TEXT,
				ADD COLUMN regional BOOLEAN
		`); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE dexes ADD CONSTRAINT dexes_game_id_foreign FOREIGN KEY (game_id) REFERENCES games (id)"); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec("CREATE INDEX dexes_game_id_index ON dexes (game_id)")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec(`
			ALTER TABLE dexes
				DROP COLUMN game_id,
				DROP COLUMN regional
		`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230618113818_add_game_id_and_regional_to_dexes", up, down, opts)
}
