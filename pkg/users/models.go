package users

import (
	"time"

	"github.com/pokedextracker/api.pokedextracker.com/pkg/dexes"
	"github.com/segmentio/encoding/json"
)

type User struct {
	tableName struct{} `pg:"users,alias:u"`

	ID               int          `json:"id"`
	Username         string       `json:"username"`
	FriendCode3DS    *string      `pg:"friend_code_3ds" json:"friend_code_3ds"`
	FriendCodeSwitch *string      `json:"friend_code_switch"`
	Dexes            []*dexes.Dex `pg:"rel:has-many" json:"dexes"`
	Password         string       `json:"-"`
	LastIP           *string      `json:"-"`
	LastLogin        *time.Time   `json:"-"`
	Referrer         *string      `json:"-"`
	StripeID         *string      `json:"-"`
	Donated          bool         `pg:"-" json:"donated"`
	DateCreated      time.Time    `json:"date_created"`
	DateModified     time.Time    `json:"date_modified"`
}

// MarshalJSON is just needed for parity testing. Once we're actually using this in production, we can remove it.
func (u *User) MarshalJSON() ([]byte, error) {
	type Alias User
	return json.Marshal(&struct {
		*Alias
		DateCreated  string `json:"date_created"`
		DateModified string `json:"date_modified"`
	}{
		Alias:        (*Alias)(u),
		DateCreated:  u.DateCreated.Format("2006-01-02T15:04:05.000Z07:00"),
		DateModified: u.DateModified.Format("2006-01-02T15:04:05.000Z07:00"),
	})
}
