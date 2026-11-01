package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Session struct {
	tableName struct{} `pg:"users,alias:u"`

	ID               int        `json:"id"`
	Username         string     `json:"username"`
	FriendCode3DS    *string    `pg:"friend_code_3ds" json:"friend_code_3ds" tstype:"string | null,required"`
	FriendCodeSwitch *string    `json:"friend_code_switch" tstype:"string | null,required"`
	Password         string     `json:"-"`
	LastIP           *string    `json:"-"`
	LastLogin        *time.Time `json:"-"`
	DateCreated      time.Time  `json:"date_created"`
	DateModified     time.Time  `json:"date_modified"`

	// This is so that we can use this struct as a Claims struct, and we can sign it as a payload.
	jwt.RegisteredClaims `pg:"-" tstype:"-"`
}
