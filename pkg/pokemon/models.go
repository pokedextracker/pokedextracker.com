package pokemon

import (
	"time"

	"github.com/pokedextracker/api.pokedextracker.com/pkg/games"
	"github.com/segmentio/encoding/json"
)

type Pokemon struct {
	tableName struct{} `pg:"pokemon,alias:p"`

	ID                int               `json:"id"`
	NationalID        int               `json:"national_id"`
	Name              string            `json:"name"`
	GameFamilyID      string            `json:"-"`
	GameFamily        *games.GameFamily `pg:"gf,rel:has-one" json:"game_family"`
	Form              *string           `json:"form"`
	Box               *string           `pg:"-" json:"box"`
	DexNumber         int               `pg:"-" json:"dex_number"`
	Locations         []*Location       `pg:"l,rel:has-many" json:"locations"`
	NationalOrder     int               `json:"-"`
	EvolutionFamilyID int               `json:"-"`
	EvolutionFamily   *EvolutionFamily  `pg:"-" json:"evolution_family"`
	DateCreated       time.Time         `json:"-"`
	DateModified      time.Time         `json:"-"`
}

type Location struct {
	tableName struct{} `pg:"locations,alias:l"`

	GameID    string      `json:"-"`
	Game      *games.Game `pg:"g,rel:has-one" json:"game"`
	PokemonID int         `json:"-"`
	Value     string      `json:"value"`
	Values    []string    `pg:",array" json:"values"`
}

// MarshalJSON is just needed for parity testing. Once we're actually using this in production, we can remove it.
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

type Evolution struct {
	tableName struct{} `pg:"evolutions,alias:e"`

	EvolvingPokemonID int               `json:"-"`
	EvolvingPokemon   *EvolutionPokemon `pg:"evolving,rel:has-one" json:"-"`
	EvolvedPokemonID  int               `json:"-"`
	EvolvedPokemon    *EvolutionPokemon `pg:"evolved,rel:has-one" json:"-"`
	EvolutionFamilyID int               `json:"-"`
	Stage             int               `json:"-"`
	Trigger           string            `json:"trigger"`
	Level             *int              `json:"level,omitempty"`
	CandyCount        *int              `json:"candy_count,omitempty"`
	Stone             *string           `json:"stone,omitempty"`
	HeldItem          *string           `json:"held_item,omitempty"`
	Notes             *string           `json:"notes,omitempty"`
	DateCreated       time.Time         `json:"-"`
	DateModified      time.Time         `json:"-"`
}

type EvolutionFamily struct {
	Pokemon    [][]*EvolutionPokemon `json:"pokemon"`
	Evolutions [][]*Evolution        `json:"evolutions"`
}

type EvolutionPokemon struct {
	tableName struct{} `pg:"pokemon,alias:p"`

	ID           int               `json:"id"`
	NationalID   int               `json:"national_id"`
	Name         string            `json:"name"`
	GameFamilyID string            `json:"-"`
	GameFamily   *games.GameFamily `pg:"gf,rel:has-one" json:"-"`
	Form         *string           `json:"form"`
}
