package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	const limit = 10000

	upBatch := func(db orm.DB) (int, error) {
		res, err := db.Exec(`
			UPDATE captures
			SET
				dex_id = dexes.id
			FROM users
			INNER JOIN dexes ON users.id = dexes.user_id
			WHERE
				captures.user_id = users.id
				AND (captures.pokemon_id, captures.user_id) IN (SELECT pokemon_id, user_id FROM captures WHERE dex_id IS NULL LIMIT ?)
		`, limit)
		if err != nil {
			return 0, err
		}

		return res.RowsAffected(), nil
	}

	downBatch := func(db orm.DB) (int, error) {
		res, err := db.Exec(`
			UPDATE captures
			SET
				dex_id = NULL
			WHERE
				(captures.pokemon_id, captures.user_id) IN (SELECT pokemon_id, user_id FROM captures WHERE dex_id IS NOT NULL LIMIT ?)
		`, limit)
		if err != nil {
			return 0, err
		}

		return res.RowsAffected(), nil
	}

	up := func(db orm.DB) error {
		for {
			count, err := upBatch(db)
			if err != nil {
				return errors.WithStack(err)
			}
			if count != limit {
				break
			}
		}
		_, err := db.Exec(`
			BEGIN;
			ALTER TABLE captures DROP CONSTRAINT captures_pkey;
			ALTER TABLE captures ADD CONSTRAINT captures_pkey PRIMARY KEY (dex_id, pokemon_id);
			COMMIT;
		`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		if _, err := db.Exec(`
			BEGIN;
			ALTER TABLE captures DROP CONSTRAINT captures_pkey;
			ALTER TABLE captures ADD CONSTRAINT captures_pkey PRIMARY KEY (user_id, pokemon_id);
			ALTER TABLE captures ALTER COLUMN dex_id DROP NOT NULL;
			COMMIT;
		`); err != nil {
			return errors.WithStack(err)
		}
		for {
			count, err := downBatch(db)
			if err != nil {
				return errors.WithStack(err)
			}
			if count != limit {
				break
			}
		}
		return nil
	}

	opts := migrations.MigrationOptions{DisableTransaction: true}

	migrations.Register("20230614115839_backfill_captures_dex_id", up, down, opts)
}
