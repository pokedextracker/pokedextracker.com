package captures

import (
	"context"
	"time"

	"github.com/go-pg/pg/v10"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/errcodes"
)

type ListCapturesOptions struct {
	DexID      *int
	PokemonIDs []int
	// DexTypeID is to fetch and populate the correct box and dex number on the associated Pokemon.
	DexTypeID *int
}

type DeleteCapturesOptions struct {
	DexID      int
	PokemonIDs []int
}

type Service struct {
	db *pg.DB
}

func NewService(db *pg.DB) *Service {
	return &Service{db}
}

func (svc *Service) CreateCaptures(ctx context.Context, captures []*Capture) error {
	if len(captures) == 0 {
		// We're not inserting any captures, so we just return early.
		return nil
	}

	now := time.Now()
	for _, capture := range captures {
		capture.DateCreated = now
		capture.DateModified = now

		_, err := svc.db.
			ModelContext(ctx, capture).
			Insert()
		if err != nil {
			if errcodes.IsPGUniqueViolation(err) {
				// If it's a unique constraint error, just ignore it. The only unique constraint we have on captures is
				// with (dex_id, pokemon_id), so if we get a conflict, it means we already have the capture in the
				// database.
				continue
			}
			return errors.WithStack(err)
		}
	}

	// TODO: Once we upgrade to a newer version Postgres, insert all captures at once and use OnConflict.
	// _, err := svc.db.
	// 	ModelContext(ctx, &captures).
	// 	OnConflict("DO NOTHING").
	// 	Insert()
	// return errors.WithStack(err)

	return nil
}

func (svc *Service) ListCaptures(ctx context.Context, opts ListCapturesOptions) ([]*Capture, error) {
	captures := make([]*Capture, 0)

	q := svc.db.
		ModelContext(ctx, &captures).
		Relation("Pokemon").
		Relation("Pokemon.GameFamily")

	if opts.DexID != nil {
		q = q.Where("c.dex_id = ?", *opts.DexID)
	}
	if len(opts.PokemonIDs) > 0 {
		q = q.WhereIn("c.pokemon_id IN (?)", opts.PokemonIDs)
	}
	if opts.DexTypeID != nil {
		// Load in the box and dex number for this dex type.
		q = q.
			Column("c.*").
			ColumnExpr("dtp.box AS p__box").
			ColumnExpr("dtp.dex_number AS p__dex_number").
			Join("LEFT OUTER JOIN dex_types_pokemon dtp ON dtp.pokemon_id = p.id AND dtp.dex_type_id = ?", *opts.DexTypeID)
	}

	err := q.Select()
	if err != nil {
		return nil, errors.WithStack(err)
	}

	return captures, nil
}

func (svc *Service) DeleteCaptures(ctx context.Context, opts DeleteCapturesOptions) error {
	if len(opts.PokemonIDs) == 0 {
		// We're not deleting any captures, so we just return early.
		return nil
	}

	_, err := svc.db.
		ModelContext(ctx, (*Capture)(nil)).
		Where("dex_id = ?", opts.DexID).
		WhereIn("pokemon_id IN (?)", opts.PokemonIDs).
		Delete()
	return errors.WithStack(err)
}
