package auth

import (
	"context"
	"time"

	"github.com/go-pg/pg/v10"
	"github.com/golang-jwt/jwt/v5"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/config"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/errcodes"
)

type RetrieveSessionOptions struct {
	Username *string
}

type UpdateSessionOptions struct {
	Columns []string
}

type Service struct {
	config *config.Config
	db     *pg.DB
}

func NewService(cfg *config.Config, db *pg.DB) *Service {
	return &Service{cfg, db}
}

func (svc *Service) RetrieveSession(ctx context.Context, opts RetrieveSessionOptions) (*Session, error) {
	session := &Session{}

	q := svc.db.ModelContext(ctx, session)

	if opts.Username != nil {
		q = q.Where("u.username = ?", *opts.Username)
	}

	err := q.Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, errcodes.NotFound("user")
		}
		return nil, errors.WithStack(err)
	}

	return session, nil
}

func (svc *Service) UpdateSession(ctx context.Context, session *Session, opts UpdateSessionOptions) error {
	if len(opts.Columns) == 0 {
		// There's nothing to update, so we just return early.
		return nil
	}

	columns := append(opts.Columns, "date_modified")
	session.DateModified = time.Now()

	_, err := svc.db.
		ModelContext(ctx, session).
		Column(columns...).
		WherePK().
		Update()
	return errors.WithStack(err)
}

func (svc *Service) SignSession(_ context.Context, session *Session) (string, error) {
	// We set values on the attached claims object.
	session.RegisteredClaims.IssuedAt = jwt.NewNumericDate(time.Now())
	session.RegisteredClaims.Issuer = "pokedextracker_api"

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, session)
	signed, err := token.SignedString(svc.config.JWTSecret)
	if err != nil {
		return "", errors.WithStack(err)
	}

	return signed, nil
}

func (svc *Service) ParseToken(_ context.Context, signed string) (*Session, error) {
	token, err := jwt.ParseWithClaims(signed, &Session{}, func(token *jwt.Token) (interface{}, error) {
		return svc.config.JWTSecret, nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenMalformed) {
			return nil, errcodes.BadAuthHeaderFormat()
		}
		if errors.Is(err, jwt.ErrSignatureInvalid) {
			return nil, errcodes.InvalidJWTSignature()
		}
		return nil, errors.WithStack(err)
	}

	session, ok := token.Claims.(*Session)
	if !ok {
		// This shouldn't really happen because it would mean that we correctly signed a token that we can't parse out.
		// It would mean that we made a bad code change and should probably roll back.
		return nil, errcodes.CannotParseToken()
	}
	if !token.Valid {
		// I believe this would happen if we were enforcing any of the claims of the JWT, but we aren't, so I don't
		// think this should ever happen either.
		return nil, errcodes.InvalidJWT()
	}

	return session, nil
}
