package dexes

import (
	"time"

	"github.com/pokedextracker/pokedextracker.com/pkg/dextypes"
	"github.com/pokedextracker/pokedextracker.com/pkg/games"
)

type Dex struct {
	tableName struct{} `pg:"dexes,alias:d"`

	ID           int               `json:"id"`
	UserID       int               `json:"user_id"`
	Title        string            `json:"title"`
	Slug         string            `json:"slug"`
	Shiny        bool              `pg:",use_zero" json:"shiny"`
	GameID       string            `json:"-"`
	Game         *games.Game       `pg:"g,rel:has-one" json:"game" tstype:",required"`
	DexTypeID    int               `json:"-"`
	DexType      *dextypes.DexType `pg:"dt,rel:has-one" json:"dex_type" tstype:",required"`
	Regional     *bool             `json:"regional" tstype:"boolean | null,required"`
	Caught       int               `pg:"-" json:"caught"`
	Total        int               `pg:"-" json:"total"`
	DateCreated  time.Time         `json:"date_created"`
	DateModified time.Time         `json:"date_modified"`
}
