package pokemon

import (
	"context"
	"regexp"

	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/dextypes"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/errcodes"
)

type RetrievePokemonOptions struct {
	ID      *int
	DexType *dextypes.DexType
}

type ListPokemonOptions struct {
	IDs []int
}

type RetrieveEvolutionFamilyOptions struct {
	EvolutionFamilyID *int
	DexTypeID         *int
	GameFamilyID      *string
}

var expansionRE = regexp.MustCompile(`^(.*)_expansion_pass$`)

type Service struct {
	db *pg.DB
}

func NewService(db *pg.DB) *Service {
	return &Service{db}
}

func (svc *Service) RetrievePokemon(ctx context.Context, opts RetrievePokemonOptions) (*Pokemon, error) {
	pokemon := &Pokemon{}

	q := svc.db.
		ModelContext(ctx, pokemon).
		Relation("GameFamily").
		Relation("Locations", func(sq *orm.Query) (*orm.Query, error) {
			return sq.
				Join("INNER JOIN game_families gf ON gf.id = g.game_family_id").
				Order("gf.order DESC", "g.order ASC"), nil
		}).
		Relation("Locations.Game").
		Relation("Locations.Game.GameFamily")

	if opts.ID != nil {
		q = q.Where("p.id = ?", *opts.ID)
	}
	if opts.DexType != nil {
		// Load in the box and dex number for this dex type.
		q = q.
			Column("p.*").
			ColumnExpr("dtp.box AS box").
			ColumnExpr("dtp.dex_number AS dex_number").
			Join("LEFT OUTER JOIN dex_types_pokemon dtp ON dtp.pokemon_id = p.id AND dtp.dex_type_id = ?", opts.DexType.ID)
	}

	err := q.Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, errcodes.NotFound("pokemon")
		}
		return nil, errors.WithStack(err)
	}

	// Filter out the locations based on the game family and region status.
	if opts.DexType != nil {
		// Determine if this dex type is a regional one based on the tags.
		regional := false
		for _, tag := range opts.DexType.Tags {
			// "game national" still scopes the Pokemon to the specific game, so we consider it to be "regional".
			regional = regional || tag == "regional" || tag == "game national"
		}

		locations := make([]*Location, 0)
		for _, location := range pokemon.Locations {
			if regional {
				m := expansionRE.FindAllStringSubmatch(opts.DexType.GameFamilyID, -1)
				if m != nil && location.Game.GameFamilyID == m[0][1] {
					// If the game family we're filtering by is the regional sword and shield expansion pass dex, then
					// it should include the locations for the expansion and the original sword and shield.
					locations = append(locations, location)
				}

				if opts.DexType.GameFamilyID == location.Game.GameFamilyID {
					// Since this is a regional gex, we only show the locations for this game's game family.
					locations = append(locations, location)
				}

				// This is a location of a different game family, so we just skip over it.
				continue
			}

			if opts.DexType.GameFamily.Generation >= location.Game.GameFamily.Generation {
				// This is a national dex, so we want to show all locations up to this game's generation.
				locations = append(locations, location)
			}
		}
		pokemon.Locations = locations
	}

	// Fetch the evolution family and attach it to the Pokemon model.
	var dexTypeID *int
	var gameFamilyID *string
	if opts.DexType != nil {
		dexTypeID = &opts.DexType.ID
		gameFamilyID = &opts.DexType.GameFamilyID
	}
	family, err := svc.RetrieveEvolutionFamily(ctx, RetrieveEvolutionFamilyOptions{
		EvolutionFamilyID: &pokemon.EvolutionFamilyID,
		DexTypeID:         dexTypeID,
		GameFamilyID:      gameFamilyID,
	})
	if err != nil {
		return nil, errors.WithStack(err)
	}

	// Filter out any evolution lines that don't have any Pokemon in them. This can happen in a pre-evolution isn't
	// present in this dex type. This can be tested on Clefairy on a regional LGPE dex.
	for len(family.Pokemon) > 0 && len(family.Pokemon[0]) == 0 {
		family.Pokemon = removeIndex(family.Pokemon, 0)
	}
	for len(family.Evolutions) > 0 && len(family.Evolutions[0]) == 0 {
		family.Evolutions = removeIndex(family.Evolutions, 0)
	}

	if len(family.Pokemon) == 0 {
		// This Pokemon has no evolutions, so we just need to add it as the single Pokemon in its family.
		family.Pokemon = append(family.Pokemon, []*EvolutionPokemon{
			{
				ID:           pokemon.ID,
				NationalID:   pokemon.NationalID,
				Name:         pokemon.Name,
				GameFamilyID: pokemon.GameFamilyID,
				GameFamily:   pokemon.GameFamily,
				Form:         pokemon.Form,
			},
		})
	}

	pokemon.EvolutionFamily = family

	return pokemon, nil
}

func (svc *Service) ListPokemon(ctx context.Context, opts ListPokemonOptions) ([]*Pokemon, error) {
	pokemon := make([]*Pokemon, 0)

	q := svc.db.
		ModelContext(ctx, &pokemon).
		Order("p.id ASC")

	if len(opts.IDs) > 0 {
		q = q.WhereIn("p.id IN (?)", opts.IDs)
	}

	err := q.Select()
	if err != nil {
		return nil, errors.WithStack(err)
	}

	return pokemon, nil
}

func (svc *Service) RetrieveEvolutionFamily(ctx context.Context, opts RetrieveEvolutionFamilyOptions) (*EvolutionFamily, error) {
	evolutions := make([]*Evolution, 0)

	q := svc.db.
		ModelContext(ctx, &evolutions).
		Relation("EvolvingPokemon").
		Relation("EvolvingPokemon.GameFamily").
		Relation("EvolvedPokemon").
		Relation("EvolvedPokemon.GameFamily").
		OrderExpr("CASE WHEN trigger = 'breed' THEN evolving.national_id ELSE evolved.national_id END, trigger DESC, evolved.national_order ASC")

	if opts.EvolutionFamilyID != nil {
		q = q.Where("e.evolution_family_id = ?", *opts.EvolutionFamilyID)
	}
	if opts.GameFamilyID != nil {
		q = q.
			Where(`evolved__gf.order <= (SELECT "order" FROM game_families WHERE id = ?)`, *opts.GameFamilyID).
			Where(`evolving__gf.order <= (SELECT "order" FROM game_families WHERE id = ?)`, *opts.GameFamilyID)
	}
	if opts.DexTypeID != nil {
		q = q.
			Join("LEFT OUTER JOIN dex_types_pokemon AS evolved_dex_numbers ON evolved.id = evolved_dex_numbers.pokemon_id").
			Join("LEFT OUTER JOIN dex_types_pokemon AS evolving_dex_numbers ON evolving.id = evolving_dex_numbers.pokemon_id").
			Where("evolved_dex_numbers.dex_type_id = ? AND evolving_dex_numbers.dex_type_id = ?", *opts.DexTypeID, *opts.DexTypeID)
	}

	err := q.Select()
	if err != nil {
		return nil, errors.WithStack(err)
	}

	family := &EvolutionFamily{
		Pokemon:    make([][]*EvolutionPokemon, 0),
		Evolutions: make([][]*Evolution, 0),
	}

	for _, evolution := range evolutions {
		i := evolution.Stage - 1

		for i+1 >= len(family.Pokemon) {
			family.Pokemon = append(family.Pokemon, make([]*EvolutionPokemon, 0))
		}

		first := evolution.EvolvingPokemon
		second := evolution.EvolvedPokemon
		if evolution.Trigger == "breed" {
			first, second = second, first
		}

		if !hasEvolutionPokemon(first, family.Pokemon[i]) {
			family.Pokemon[i] = append(family.Pokemon[i], first)
		}
		if !hasEvolutionPokemon(second, family.Pokemon[i+1]) {
			family.Pokemon[i+1] = append(family.Pokemon[i+1], second)
		}

		for i >= len(family.Evolutions) {
			family.Evolutions = append(family.Evolutions, make([]*Evolution, 0))
		}
		family.Evolutions[i] = append(family.Evolutions[i], evolution)
	}

	return family, nil
}

func hasEvolutionPokemon(ep *EvolutionPokemon, pokemon []*EvolutionPokemon) bool {
	for _, p := range pokemon {
		if p.ID == ep.ID {
			return true
		}
	}
	return false
}

// removeIndex is a generic function that takes in any slice and an index, and it returns a new slice with the element
// at that index removed.
func removeIndex[T any](s []T, i int) []T {
	return append(s[0:i], s[i+1:]...)
}
