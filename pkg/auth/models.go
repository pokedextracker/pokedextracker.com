package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/segmentio/encoding/json"
)

type Session struct {
	tableName struct{} `pg:"users,alias:u"`

	ID               int        `json:"id"`
	Username         string     `json:"username"`
	FriendCode3DS    *string    `pg:"friend_code_3ds" json:"friend_code_3ds"`
	FriendCodeSwitch *string    `json:"friend_code_switch"`
	Password         string     `json:"-"`
	LastIP           *string    `json:"-"`
	LastLogin        *time.Time `json:"-"`
	DateCreated      time.Time  `json:"date_created"`
	DateModified     time.Time  `json:"date_modified"`

	// This is so that we can use this struct as a Claims struct, and we can sign it as a payload.
	jwt.RegisteredClaims `pg:"-"`
}

// MarshalJSON is just needed for parity testing. Once we're actually using this in production, we can remove it.
func (s *Session) MarshalJSON() ([]byte, error) {
	type Alias Session
	return json.Marshal(&struct {
		*Alias
		DateCreated  string `json:"date_created"`
		DateModified string `json:"date_modified"`
	}{
		Alias:        (*Alias)(s),
		DateCreated:  s.DateCreated.Format("2006-01-02T15:04:05.000Z07:00"),
		DateModified: s.DateModified.Format("2006-01-02T15:04:05.000Z07:00"),
	})
}
