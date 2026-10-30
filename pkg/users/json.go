package users

import "github.com/segmentio/encoding/json"

// MarshalJSON writes the user's dates with milliseconds, the format the API
// has always sent.
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
