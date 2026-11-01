package pokemon

import (
	"time"

	"github.com/pokedextracker/pokedextracker.com/pkg/games"
)

type Pokemon struct {
	tableName struct{} `pg:"pokemon,alias:p"`

	ID                int               `json:"id"`
	NationalID        int               `json:"national_id"`
	Name              string            `json:"name"`
	GameFamilyID      string            `json:"-"`
	GameFamily        *games.GameFamily `pg:"gf,rel:has-one" json:"game_family" tstype:",required"`
	Form              *string           `json:"form" tstype:"string | null,required"`
	Box               *string           `pg:"-" json:"box" tstype:"string | null,required"`
	DexNumber         int               `pg:"-" json:"dex_number"`
	Locations         []*Location       `pg:"l,rel:has-many" json:"locations" tstype:"Location[]"`
	NationalOrder     int               `json:"-"`
	EvolutionFamilyID int               `json:"-"`
	EvolutionFamily   *EvolutionFamily  `pg:"-" json:"evolution_family" tstype:",required"`
	DateCreated       time.Time         `json:"-"`
	DateModified      time.Time         `json:"-"`
}

type Location struct {
	tableName struct{} `pg:"locations,alias:l"`

	GameID    string      `json:"-"`
	Game      *games.Game `pg:"g,rel:has-one" json:"game" tstype:",required"`
	PokemonID int         `json:"-"`
	// MarshalJSON sends Values as value, so it's a list in the API.
	Value  string   `json:"value" tstype:"string[]"`
	Values []string `pg:",array" json:"values"`
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
	Pokemon    [][]*EvolutionPokemon `json:"pokemon" tstype:"EvolutionPokemon[][]"`
	Evolutions [][]*Evolution        `json:"evolutions" tstype:"Evolution[][]"`
}

type EvolutionPokemon struct {
	tableName struct{} `pg:"pokemon,alias:p"`

	ID           int               `json:"id"`
	NationalID   int               `json:"national_id"`
	Name         string            `json:"name"`
	GameFamilyID string            `json:"-"`
	GameFamily   *games.GameFamily `pg:"gf,rel:has-one" json:"-"`
	Form         *string           `json:"form" tstype:"string | null,required"`
}
