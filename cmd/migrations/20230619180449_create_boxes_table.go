package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec(`
			CREATE TABLE boxes (
			    game_family_id TEXT NOT NULL,
			    regional BOOLEAN NOT NULL,
			    pokemon_id INT NOT NULL,
			    value TEXT NOT NULL,
			    
			    PRIMARY KEY (game_family_id, pokemon_id)
			)
		`)
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE boxes ADD CONSTRAINT boxes_game_family_id_foreign FOREIGN KEY (game_family_id) REFERENCES game_families (id)")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE boxes ADD CONSTRAINT boxes_pokemon_id_foreign FOREIGN KEY (pokemon_id) REFERENCES pokemon (id) ON DELETE CASCADE")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("CREATE INDEX boxes_pokemon_id_index ON boxes (pokemon_id)")
		if err != nil {
			return errors.WithStack(err)
		}

		type pokemon struct {
			tableName struct{} `pg:"pokemon,alias:pokemon"`

			ID  string
			Box *string `pg:"box"`
		}

		poke := []pokemon{}
		err = db.Model(&poke).Select()
		if err != nil {
			return errors.WithStack(err)
		}

		for _, p := range poke {
			if p.Box != nil {
				_, err = db.Exec("INSERT INTO boxes VALUES ('ultra_sun_ultra_moon', false, ?, ?)", p.ID, *p.Box)
				if err != nil {
					return errors.WithStack(err)
				}
				_, err = db.Exec("INSERT INTO boxes VALUES ('sun_moon', false, ?, ?)", p.ID, *p.Box)
				if err != nil {
					return errors.WithStack(err)
				}
			}
		}
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("DROP TABLE boxes")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230619180449_create_boxes_table", up, down, opts)
}
