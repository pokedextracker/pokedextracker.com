package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	const limit = 1000
	type user struct {
		tableName struct{} `pg:"users,alias:users"`

		ID int
	}
	type dex struct {
		tableName struct{} `pg:"dexes,alias:dexes"`

		ID         string
		UserID     int
		Title      string
		Slug       string
		Shiny      bool `pg:",notnull"`
		Generation int
	}

	batch := func(db orm.DB) (int, error) {
		users := []user{}
		dexes := []dex{}

		if err := db.Model(&users).Join("LEFT OUTER JOIN dexes ON users.id = dexes.user_id").Where("dexes.id IS NULL").Limit(limit).Select(); err != nil {
			return 0, err
		}

		// go-pg returns an error when inserting an empty slice
		if len(users) == 0 {
			return 0, nil
		}

		for _, u := range users {
			dexes = append(dexes, dex{
				UserID:     u.ID,
				Title:      "Living Dex",
				Slug:       "living-dex",
				Shiny:      false,
				Generation: 6,
			})
		}

		if _, err := db.Model(&dexes).Insert(); err != nil {
			return 0, err
		}

		return len(dexes), nil
	}

	up := func(db orm.DB) error {
		for {
			count, err := batch(db)
			if err != nil {
				return errors.WithStack(err)
			}
			if count != limit {
				break
			}
		}
		return nil
	}

	down := func(db orm.DB) error {
		_, err := db.Exec("DELETE FROM dexes WHERE title = ?", "Living Dex")
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{DisableTransaction: true}

	migrations.Register("20230613201845_backfill_dexes_table", up, down, opts)
}
