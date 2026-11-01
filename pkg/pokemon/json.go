package pokemon

import "github.com/segmentio/encoding/json"

// MarshalJSON sends a location's values as value too, which the API has always
// done, in place of the single value stored with them.
func (l *Location) MarshalJSON() ([]byte, error) {
	type Alias Location
	return json.Marshal(&struct {
		*Alias
		Value []string `json:"value"`
	}{
		Alias: (*Alias)(l),
		Value: l.Values,
	})
}
