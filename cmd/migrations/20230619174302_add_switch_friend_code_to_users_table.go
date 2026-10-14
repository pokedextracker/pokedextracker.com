package main

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	migrations "github.com/robinjoseph08/go-pg-migrations/v3"
)

func init() {
	up := func(db orm.DB) error {
		_, err := db.Exec(`
			ALTER TABLE users
				ADD COLUMN friend_code_3ds VARCHAR(14),
				ADD COLUMN friend_code_switch VARCHAR(17)
		`)
		if err != nil {
			return errors.WithStack(err)
		}
		_, err = db.Exec(`UPDATE users SET friend_code_3ds = friend_code`)
		return errors.WithStack(err)
	}

	down := func(db orm.DB) error {
		_, err := db.Exec(`
			ALTER TABLE users
				DROP COLUMN friend_code_3ds,
				DROP COLUMN friend_code_switch
		`)
		return errors.WithStack(err)
	}

	opts := migrations.MigrationOptions{}

	migrations.Register("20230619174302_add_switch_friend_code_to_users_table", up, down, opts)
}
