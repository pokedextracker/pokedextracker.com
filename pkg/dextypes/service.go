package dextypes

import (
	"context"

	"github.com/go-pg/pg/v10"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/errcodes"
)

type RetrieveDexTypeOptions struct {
	ID                *int
	IncludeGameFamily bool
}

type Service struct {
	db *pg.DB
}

func NewService(db *pg.DB) *Service {
	return &Service{db}
}

func (svc *Service) RetrieveDexType(ctx context.Context, opts RetrieveDexTypeOptions) (*DexType, error) {
	dexType := &DexType{}

	q := svc.db.ModelContext(ctx, dexType)

	if opts.ID != nil {
		q = q.Where("dt.id = ?", *opts.ID)
	}
	if opts.IncludeGameFamily {
		q = q.Relation("GameFamily")
	}

	err := q.Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, errcodes.NotFound("dex type")
		}
		return nil, errors.WithStack(err)
	}

	return dexType, nil
}

func (svc *Service) ListDexTypes(ctx context.Context) ([]*DexType, error) {
	dexTypes := make([]*DexType, 0)

	q := svc.db.
		ModelContext(ctx, &dexTypes).
		Join("INNER JOIN game_families gf ON dt.game_family_id = gf.id").
		Order("gf.order DESC", "dt.order ASC")

	err := q.Select()
	if err != nil {
		return nil, errors.WithStack(err)
	}

	return dexTypes, nil
}
