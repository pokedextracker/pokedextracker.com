package games

import (
	"context"

	"github.com/go-pg/pg/v10"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/errcodes"
)

type RetrieveGameOptions struct {
	ID *string
}

type Service struct {
	db *pg.DB
}

func NewService(db *pg.DB) *Service {
	return &Service{db}
}

func (svc *Service) RetrieveGame(ctx context.Context, opts RetrieveGameOptions) (*Game, error) {
	game := &Game{}

	q := svc.db.ModelContext(ctx, game)

	if opts.ID != nil {
		q = q.Where("g.id = ?", *opts.ID)
	}

	err := q.Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, errcodes.NotFound("game")
		}
		return nil, errors.WithStack(err)
	}

	return game, nil
}

func (svc *Service) ListGames(ctx context.Context) ([]*Game, error) {
	games := make([]*Game, 0)

	q := svc.db.
		ModelContext(ctx, &games).
		Relation("GameFamily").
		Where("gf.published = ?", true).
		Order("gf.order DESC", "g.order ASC")

	err := q.Select()
	if err != nil {
		return nil, errors.WithStack(err)
	}

	return games, nil
}
