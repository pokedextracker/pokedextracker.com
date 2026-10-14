package dexes

import (
	"context"
	"time"

	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/errcodes"
)

type RetrieveDexOptions struct {
	ID       *int
	Slug     *string
	Username *string

	IncludeDexTypePokemon bool
}

type UpdateDexOptions struct {
	Columns         []string
	UpdatingDexType bool
}

type DeleteDexOptions struct {
	ID     int
	UserID int
}

type Service struct {
	db *pg.DB
}

func NewService(db *pg.DB) *Service {
	return &Service{db}
}

func (svc *Service) CreateDex(ctx context.Context, dex *Dex) error {
	_, err := svc.db.
		ModelContext(ctx, dex).
		Insert()
	if err != nil {
		if errcodes.IsPGUniqueViolation(err) {
			// If we tried to use a title/slug value that already exists for this user, it will throw this error.
			return errcodes.ExistingDex()
		}
		return errors.WithStack(err)
	}
	return nil
}

func (svc *Service) RetrieveDex(ctx context.Context, opts RetrieveDexOptions) (*Dex, error) {
	dex := &Dex{}

	q := svc.db.
		ModelContext(ctx, dex).
		Column("d.*").
		ColumnExpr("(SELECT COUNT(*) FROM captures WHERE dex_id = d.id) AS caught").
		ColumnExpr("(SELECT COUNT(*) FROM dex_types_pokemon WHERE dex_type_id = d.dex_type_id) AS total").
		Relation("DexType").
		Relation("DexType.BaseDexType").
		Relation("Game").
		Relation("Game.GameFamily")

	if opts.ID != nil {
		q = q.Where("d.id = ?", *opts.ID)
	}
	if opts.Slug != nil {
		q = q.Where("d.slug = ?", *opts.Slug)
	}
	if opts.Username != nil {
		q = q.
			Join("INNER JOIN users u ON u.id = d.user_id").
			Where("u.username = ?", *opts.Username)
	}
	if opts.IncludeDexTypePokemon {
		q = q.
			Relation("DexType.Pokemon", func(sq *orm.Query) (*orm.Query, error) {
				return sq.Order("order ASC"), nil
			}).
			Relation("DexType.Pokemon.GameFamily")
	}

	err := q.Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, errcodes.NotFound("dex")
		}
		return nil, errors.WithStack(err)
	}

	return dex, nil
}

func (svc *Service) UpdateDex(ctx context.Context, dex *Dex, opts UpdateDexOptions) error {
	if len(opts.Columns) == 0 && !opts.UpdatingDexType {
		// We're not updating anything, so just return early.
		return nil
	}

	columns := append(opts.Columns, "date_modified")
	dex.DateModified = time.Now()

	err := svc.db.RunInTransaction(ctx, func(tx *pg.Tx) error {
		if opts.UpdatingDexType {
			// We're changing dex types, so we need to delete any captures that are part of the old dex type, but are
			// not in the new one.
			_, err := tx.ExecContext(ctx, `
DELETE FROM captures WHERE pokemon_id IN (
	SELECT pokemon_id FROM dex_types_pokemon WHERE pokemon_id NOT IN (
		SELECT pokemon_id FROM dex_types_pokemon WHERE dex_type_id = ?
	) AND dex_type_id = (
		SELECT dex_type_id FROM dexes WHERE id = ?
	)
) AND dex_id = ?
`, dex.DexTypeID, dex.ID, dex.ID)
			if err != nil {
				return errors.WithStack(err)
			}
		}

		_, err := tx.
			ModelContext(ctx, dex).
			Column(columns...).
			WherePK().
			Update()
		if err != nil {
			if errors.Is(err, pg.ErrNoRows) {
				return errcodes.NotFound("dex")
			}
			if errcodes.IsPGUniqueViolation(err) {
				// If we tried to update the dex's title/slug to a value that already exists for this user, it will
				// throw this error.
				return errcodes.ExistingDex()
			}
			return errors.WithStack(err)
		}

		return nil
	})
	return errors.WithStack(err)
}

func (svc *Service) DeleteDex(ctx context.Context, opts DeleteDexOptions) error {
	count, err := svc.db.
		ModelContext(ctx, (*Dex)(nil)).
		Where("d.user_id = ?", opts.UserID).
		Count()
	if err != nil {
		return errors.WithStack(err)
	}

	if count == 1 {
		return errcodes.AtLeastOneDex()
	}

	_, err = svc.db.
		ModelContext(ctx, (*Dex)(nil)).
		Where("id = ?", opts.ID).
		Delete()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return errcodes.NotFound("dex")
		}
		return errors.WithStack(err)
	}

	return nil
}
