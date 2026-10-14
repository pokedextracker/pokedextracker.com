package dextypes

import (
	"github.com/go-pg/pg/v10/orm"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/games"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/pokemoncaptures"
)

func init() {
	// This is necessary for many2many relationships starting in go-pg v10.
	orm.RegisterTable((*DexTypePokemon)(nil))
}

type DexType struct {
	tableName struct{} `pg:"dex_types,alias:dt"`

	ID            int                        `json:"id"`
	Name          string                     `json:"name"`
	Description   *string                    `json:"description,omitempty"`
	GameFamilyID  string                     `json:"game_family_id"`
	GameFamily    *games.GameFamily          `pg:"gf,rel:has-one" json:"-"`
	Order         int                        `json:"order"`
	Tags          []string                   `pg:",array" json:"tags"`
	BaseDexTypeID *int                       `json:"base_dex_type_id,omitempty"`
	BaseDexType   *DexType                   `json:"base_dex_type,omitempty"`
	Pokemon       []*pokemoncaptures.Pokemon `pg:"p,many2many:dex_types_pokemon" json:"-"`
}

type DexTypePokemon struct {
	tableName struct{} `pg:"dex_types_pokemon,alias:dtp"`

	DexTypeID int     `json:"dex_type_id"`
	PokemonID int     `json:"pokemon_id"`
	Box       *string `json:"box"`
	Order     int     `json:"order"`
	DexNumber int     `json:"dex_number"`
}
