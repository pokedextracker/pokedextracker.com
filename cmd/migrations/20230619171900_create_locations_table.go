package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec(`
			CREATE TABLE locations (
			    game_id TEXT NOT NULL,
			    pokemon_id INT NOT NULL,
			    value TEXT NOT NULL,
			    
			    PRIMARY KEY (game_id, pokemon_id)
			)
		`)
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE locations ADD CONSTRAINT locations_game_id_foreign FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("CREATE INDEX locations_game_id_index ON locations (game_id)")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE locations ADD CONSTRAINT locations_pokemon_id_foreign FOREIGN KEY (pokemon_id) REFERENCES pokemon (id) ON DELETE CASCADE")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("CREATE INDEX locations_pokemon_id_index ON locations (pokemon_id)")
		if err != nil {
			return errors.WithStack(err)
		}

		type pokemon struct {
			tableName struct{} `pg:"pokemon,alias:pokemon"`

			ID           string
			XLocation    *string `pg:"x_location"`
			YLocation    *string `pg:"y_location"`
			ORLocation   *string `pg:"or_location"`
			ASLocation   *string `pg:"as_location"`
			SunLocation  *string `pg:"sun_location"`
			MoonLocation *string `pg:"moon_location"`
			USLocation   *string `pg:"us_location"`
			UMLocation   *string `pg:"um_location"`
		}

		poke := []pokemon{}
		err = db.Model(&poke).Select()
		if err != nil {
			return errors.WithStack(err)
		}

		for _, p := range poke {
			if p.XLocation != nil {
				_, err = db.Exec("INSERT INTO locations VALUES ('x', ?, ?)", p.ID, *p.XLocation)
				if err != nil {
					return errors.WithStack(err)
				}
			}
			if p.YLocation != nil {
				_, err = db.Exec("INSERT INTO locations VALUES ('y', ?, ?)", p.ID, *p.YLocation)
				if err != nil {
					return errors.WithStack(err)
				}
			}
			if p.ORLocation != nil {
				_, err = db.Exec("INSERT INTO locations VALUES ('omega_ruby', ?, ?)", p.ID, *p.ORLocation)
				if err != nil {
					return errors.WithStack(err)
				}
			}
			if p.ASLocation != nil {
				_, err = db.Exec("INSERT INTO locations VALUES ('alpha_sapphire', ?, ?)", p.ID, *p.ASLocation)
				if err != nil {
					return errors.WithStack(err)
				}
			}
			if p.SunLocation != nil {
				_, err = db.Exec("INSERT INTO locations VALUES ('sun', ?, ?)", p.ID, *p.SunLocation)
				if err != nil {
					return errors.WithStack(err)
				}
			}
			if p.MoonLocation != nil {
				_, err = db.Exec("INSERT INTO locations VALUES ('moon', ?, ?)", p.ID, *p.MoonLocation)
				if err != nil {
					return errors.WithStack(err)
				}
			}
			if p.USLocation != nil {
				_, err = db.Exec("INSERT INTO locations VALUES ('ultra_sun', ?, ?)", p.ID, *p.USLocation)
				if err != nil {
					return errors.WithStack(err)
				}
			}
			if p.UMLocation != nil {
				_, err = db.Exec("INSERT INTO locations VALUES ('ultra_moon', ?, ?)", p.ID, *p.UMLocation)
				if err != nil {
					return errors.WithStack(err)
				}
			}
		}
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("DROP TABLE locations")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230619171900_create_locations_table", up, down, opts)
}
