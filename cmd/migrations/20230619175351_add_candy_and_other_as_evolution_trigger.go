package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE evolutions DROP CONSTRAINT evolutions_trigger_check")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE evolutions ADD CONSTRAINT evolutions_trigger_check CHECK (trigger = ANY (ARRAY['breed'::text, 'level'::text, 'stone'::text, 'trade'::text, 'candy'::text, 'other'::text])) NOT VALID")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE evolutions VALIDATE CONSTRAINT evolutions_trigger_check")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE evolutions ADD COLUMN candy_count INT")
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("ALTER TABLE evolutions DROP COLUMN candy_count")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE evolutions DROP CONSTRAINT evolutions_trigger_check")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE evolutions ADD CONSTRAINT evolutions_trigger_check CHECK (trigger = ANY (ARRAY['breed'::text, 'level'::text, 'stone'::text, 'trade'::text])) NOT VALID")
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec("ALTER TABLE evolutions VALIDATE CONSTRAINT evolutions_trigger_check")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{DisableTransaction: true}

	migrations.Register("20230619175351_add_candy_and_other_as_evolution_trigger", up, down, opts)
}
