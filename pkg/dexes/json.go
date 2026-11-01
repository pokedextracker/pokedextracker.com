package dexes

import "github.com/segmentio/encoding/json"

// MarshalJSON writes the dex's dates with milliseconds, the format the API
// has always sent.
func (d *Dex) MarshalJSON() ([]byte, error) {
	type Alias Dex
	return json.Marshal(&struct {
		*Alias
		DateCreated  string `json:"date_created"`
		DateModified string `json:"date_modified"`
	}{
		Alias:        (*Alias)(d),
		DateCreated:  d.DateCreated.Format("2006-01-02T15:04:05.000Z07:00"),
		DateModified: d.DateModified.Format("2006-01-02T15:04:05.000Z07:00"),
	})
}
