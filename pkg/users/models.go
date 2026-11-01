package users

import (
	"time"

	"github.com/pokedextracker/pokedextracker.com/pkg/dexes"
)

type User struct {
	tableName struct{} `pg:"users,alias:u"`

	ID               int          `json:"id"`
	Username         string       `json:"username"`
	FriendCode3DS    *string      `pg:"friend_code_3ds" json:"friend_code_3ds" tstype:"string | null,required"`
	FriendCodeSwitch *string      `json:"friend_code_switch" tstype:"string | null,required"`
	Dexes            []*dexes.Dex `pg:"rel:has-many" json:"dexes" tstype:"Dex[]"`
	Password         string       `json:"-"`
	LastIP           *string      `json:"-"`
	LastLogin        *time.Time   `json:"-"`
	Referrer         *string      `json:"-"`
	StripeID         *string      `json:"-"`
	Donated          bool         `pg:"-" json:"donated"`
	DateCreated      time.Time    `json:"date_created"`
	DateModified     time.Time    `json:"date_modified"`
}
