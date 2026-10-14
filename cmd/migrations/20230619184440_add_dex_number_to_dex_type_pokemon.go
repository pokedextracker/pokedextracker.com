package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec(`ALTER TABLE dex_types_pokemon ADD COLUMN dex_number INT`)
		if err != nil {
			return errors.WithStack(err)
		}
		// Update the dex number for all regional dex types, pulling from game_family_dex_numbers.
		_, err = db.Exec(`
update dex_types_pokemon set dex_number = dn.dex_number from dex_types dt, game_family_dex_numbers dn where dt.id = dex_types_pokemon.dex_type_id and dn.game_family_id = dt.game_family_id and dn.pokemon_id = dex_types_pokemon.pokemon_id and dt.name = 'Regional';
`)
		if err != nil {
			return errors.WithStack(err)
		}
		// Update the dex number for all national dex types, pulling from national IDs.
		_, err = db.Exec(`
update dex_types_pokemon set dex_number = p.national_id from dex_types dt, pokemon p where dt.id = dex_types_pokemon.dex_type_id and p.id = dex_types_pokemon.pokemon_id and dt.name = 'Full National';
`)
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE dex_types_pokemon ALTER COLUMN dex_number SET NOT NULL")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE dex_types_pokemon DROP COLUMN dex_number")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230619184440_add_dex_number_to_dex_type_pokemon", up, down, opts)
}
