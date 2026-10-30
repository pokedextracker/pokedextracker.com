package auth

import "github.com/segmentio/encoding/json"

// MarshalJSON writes the session's dates with milliseconds, the format the API
// has always sent.
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
