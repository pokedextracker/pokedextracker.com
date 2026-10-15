package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		if _, err := db.Exec(`
			ALTER TABLE pokemon
				ADD COLUMN id SERIAL,
				ADD COLUMN form TEXT,
				ADD COLUMN box TEXT,
				ADD COLUMN national_order INTEGER
		`); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE pokemon ADD CONSTRAINT pokemon_id_unique UNIQUE (id)"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("CREATE INDEX pokemon_id_index ON pokemon (id)"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("UPDATE pokemon SET id = id + (SELECT MAX(id) FROM pokemon)"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("UPDATE pokemon SET id = national_id, national_order = national_id"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE captures ADD CONSTRAINT captures_pokemon_id_foreign2 FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE NOT VALID"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE captures DROP CONSTRAINT captures_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE captures RENAME CONSTRAINT captures_pokemon_id_foreign2 TO captures_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE captures VALIDATE CONSTRAINT captures_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions ADD CONSTRAINT evolutions_evolved_pokemon_id_foreign2 FOREIGN KEY (evolved_pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE NOT VALID"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions DROP CONSTRAINT evolutions_evolved_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions RENAME CONSTRAINT evolutions_evolved_pokemon_id_foreign2 TO evolutions_evolved_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions VALIDATE CONSTRAINT evolutions_evolved_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions ADD CONSTRAINT evolutions_evolving_pokemon_id_foreign2 FOREIGN KEY (evolving_pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE NOT VALID"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions DROP CONSTRAINT evolutions_evolving_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions RENAME CONSTRAINT evolutions_evolving_pokemon_id_foreign2 TO evolutions_evolving_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions VALIDATE CONSTRAINT evolutions_evolving_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec(`
			BEGIN;
			ALTER TABLE pokemon DROP CONSTRAINT pokemon_pkey;
			ALTER TABLE pokemon ADD PRIMARY KEY (id);
			COMMIT;
		`); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE pokemon DROP CONSTRAINT IF EXISTS pokemon_national_id_unique"); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec("ALTER TABLE pokemon ALTER COLUMN national_order SET NOT NULL")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		if _, err := db.Exec("ALTER TABLE pokemon ADD CONSTRAINT pokemon_national_id_unique UNIQUE (national_id)"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE captures ADD CONSTRAINT captures_pokemon_id_foreign2 FOREIGN KEY (pokemon_id) REFERENCES pokemon(national_id) ON DELETE CASCADE NOT VALID"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE captures DROP CONSTRAINT captures_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE captures RENAME CONSTRAINT captures_pokemon_id_foreign2 TO captures_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions ADD CONSTRAINT evolutions_evolved_pokemon_id_foreign2 FOREIGN KEY (evolved_pokemon_id) REFERENCES pokemon(national_id) ON DELETE CASCADE NOT VALID"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions DROP CONSTRAINT evolutions_evolved_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions RENAME CONSTRAINT evolutions_evolved_pokemon_id_foreign2 TO evolutions_evolved_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions ADD CONSTRAINT evolutions_evolving_pokemon_id_foreign2 FOREIGN KEY (evolving_pokemon_id) REFERENCES pokemon(national_id) ON DELETE CASCADE NOT VALID"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions DROP CONSTRAINT evolutions_evolving_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec("ALTER TABLE evolutions RENAME CONSTRAINT evolutions_evolving_pokemon_id_foreign2 TO evolutions_evolving_pokemon_id_foreign"); err != nil {
			return errors.WithStack(err)
		}
		if _, err := db.Exec(`
			BEGIN;
			ALTER TABLE pokemon DROP CONSTRAINT pokemon_pkey;
			ALTER TABLE pokemon ADD PRIMARY KEY (national_id);
			COMMIT;
		`); err != nil {
			return errors.WithStack(err)
		}
		_, err := db.Exec(`
			ALTER TABLE pokemon
				DROP COLUMN id,
				DROP COLUMN form,
				DROP COLUMN box,
				DROP COLUMN national_order
		`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{DisableTransaction: true}

	migrations.Register("20230615163927_add_form_columns_to_pokemon", up, down, opts)
}
