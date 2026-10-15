package main

import (
	"reflect"

	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	const maxCentralKalosID = 153
	const maxCoastalKalosID = 153
	families := map[string][]string{
		"Kanto":         {"red_blue", "yellow", "fire_red_leaf_green"},
		"Johto":         {"gold_silver", "crystal", "heart_gold_soul_silver"},
		"Hoenn":         {"ruby_sapphire", "emerald", "omega_ruby_alpha_sapphire"},
		"Sinnoh":        {"diamond_pearl", "platinum"},
		"Unova":         {"black_white", "black_2_white_2"},
		"CentralKalos":  {"x_y"},
		"CoastalKalos":  {"x_y"},
		"MountainKalos": {"x_y"},
		"Alola":         {"sun_moon"},
	}
	type gameFamily struct {
		tableName struct{} `pg:"game_families,alias:game_families"`

		ID string
	}
	type pokemon struct {
		tableName struct{} `pg:"pokemon,alias:pokemon"`

		ID              int
		KantoID         *int
		JohtoID         *int
		HoennID         *int
		SinnohID        *int
		UnovaID         *int
		CentralKalosID  *int
		CoastalKalosID  *int
		MountainKalosID *int
		AlolaID         *int
	}
	type dexNumber struct {
		tableName struct{} `pg:"game_family_dex_numbers,alias:game_family_dex_numbers"`

		PokemonID    int
		GameFamilyID string
		DexNumber    int
	}

	up := func(db orm.DB) error {
		if _, err := db.Exec(`
			CREATE TABLE game_family_dex_numbers (
				game_family_id TEXT NOT NULL,
				pokemon_id INTEGER NOT NULL,
				dex_number INTEGER NOT NULL
			)
		`); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE game_family_dex_numbers ADD CONSTRAINT game_family_dex_numbers_game_family_id_foreign FOREIGN KEY (game_family_id) REFERENCES game_families (id)"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE game_family_dex_numbers ADD CONSTRAINT game_family_dex_numbers_pokemon_id_foreign FOREIGN KEY (pokemon_id) REFERENCES pokemon (id)"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("CREATE INDEX game_family_dex_numbers_pokemon_id_index ON game_family_dex_numbers (pokemon_id)"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE game_family_dex_numbers ADD CONSTRAINT game_family_dex_numbers_pkey PRIMARY KEY (game_family_id, pokemon_id)"); err != nil {
			return errors.WithStack(err)
		}

		gameFamilies := []gameFamily{}
		poke := []pokemon{}
		dexNumbers := []dexNumber{}

		if err := db.Model(&poke).Select(); err != nil {
			return errors.WithStack(err)
		}
		if err := db.Model(&gameFamilies).Column("id").Select(); err != nil {
			return errors.WithStack(err)
		}

		gameFamilyIDs := map[string]bool{}
		for _, gf := range gameFamilies {
			gameFamilyIDs[gf.ID] = true
		}

		for _, p := range poke {
			for region, fam := range families {
				field := region + "ID"
				r := reflect.ValueOf(p)
				v := reflect.Indirect(r).FieldByName(field)
				if v.IsNil() {
					continue
				}

				number := int(v.Elem().Int())

				if region == "CoastalKalos" {
					number += maxCentralKalosID
				} else if region == "MountainKalos" {
					number += maxCentralKalosID + maxCoastalKalosID
				}

				for _, f := range fam {
					if !gameFamilyIDs[f] {
						continue
					}

					dexNumbers = append(dexNumbers, dexNumber{
						PokemonID:    p.ID,
						GameFamilyID: f,
						DexNumber:    number,
					})
				}
			}
		}

		// go-pg returns an error when inserting an empty slice
		if len(dexNumbers) == 0 {
			return nil
		}

		_, err := db.Model(&dexNumbers).Insert()
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("DROP TABLE game_family_dex_numbers")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230618091345_create_game_family_dex_numbers_table", up, down, opts)
}
