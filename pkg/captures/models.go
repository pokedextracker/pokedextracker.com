package captures

import (
	"time"

	"github.com/pokedextracker/api.pokedextracker.com/pkg/pokemoncaptures"
)

type Capture struct {
	tableName struct{} `pg:"captures,alias:c"`

	DexID        int                      `json:"dex_id"`
	PokemonID    int                      `json:"-"`
	Pokemon      *pokemoncaptures.Pokemon `pg:"p,rel:has-one" json:"pokemon"`
	Captured     bool                     `pg:",use_zero" json:"captured"`
	DateCreated  time.Time                `json:"-"`
	DateModified time.Time                `json:"-"`
}
