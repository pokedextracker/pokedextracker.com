package pokemoncaptures

import "github.com/pokedextracker/api.pokedextracker.com/pkg/games"

type Pokemon struct {
	tableName struct{} `pg:"pokemon,alias:p"`

	ID           int               `json:"id"`
	NationalID   int               `json:"national_id"`
	Name         string            `json:"name"`
	GameFamilyID string            `json:"-"`
	GameFamily   *games.GameFamily `pg:"gf,rel:has-one" json:"game_family"`
	Form         *string           `json:"form"`
	Box          *string           `pg:"-" json:"box"`
	DexNumber    int               `pg:"-" json:"dex_number"`
}
