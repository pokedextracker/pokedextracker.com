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
			UPDATE dexes
			SET
				game_id = CASE WHEN generation = 6 THEN 'omega_ruby' ELSE 'sun' END,
				regional = region != 'national'
			WHERE
				id IN (SELECT id FROM dexes WHERE game_id IS NULL LIMIT ?)
		`, limit)
		if err != nil {
			return 0, err
		}

		return res.RowsAffected(), nil
	}

	downBatch := func(db orm.DB) (int, error) {
		res, err := db.Exec(`
			UPDATE dexes
			SET
				game_id = NULL,
				regional = NULL
			WHERE
				id IN (SELECT id FROM dexes WHERE game_id IS NOT NULL LIMIT ?)
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
			ALTER TABLE dexes ALTER COLUMN game_id SET NOT NULL;
			ALTER TABLE dexes ALTER COLUMN regional SET NOT NULL;
			COMMIT;
		`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		if _, err := db.Exec(`
			BEGIN;
			ALTER TABLE dexes ALTER COLUMN game_id DROP NOT NULL;
			ALTER TABLE dexes ALTER COLUMN regional DROP NOT NULL;
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

	migrations.Register("20230618114541_backfill_dexes_game_id_and_regional", up, down, opts)
}
