package dexes

import (
	"time"

	"github.com/pokedextracker/api.pokedextracker.com/pkg/dextypes"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/games"
	"github.com/segmentio/encoding/json"
)

type Dex struct {
	tableName struct{} `pg:"dexes,alias:d"`

	ID           int               `json:"id"`
	UserID       int               `json:"user_id"`
	Title        string            `json:"title"`
	Slug         string            `json:"slug"`
	Shiny        bool              `pg:",use_zero" json:"shiny"`
	GameID       string            `json:"-"`
	Game         *games.Game       `pg:"g,rel:has-one" json:"game"`
	DexTypeID    int               `json:"-"`
	DexType      *dextypes.DexType `pg:"dt,rel:has-one" json:"dex_type"`
	Regional     *bool             `json:"regional"`
	Caught       int               `pg:"-" json:"caught"`
	Total        int               `pg:"-" json:"total"`
	DateCreated  time.Time         `json:"date_created"`
	DateModified time.Time         `json:"date_modified"`
}

// MarshalJSON is just needed for parity testing. Once we're actually using this in production, we can remove it.
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
