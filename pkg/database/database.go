package database

import (
	"context"
	"crypto/tls"
	"fmt"
	"time"

	"github.com/go-pg/pg/v10"
	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/config"
	"github.com/robinjoseph08/golib/logger"
)

type key int

const ctxKey key = 0

func WithLogging(ctx context.Context, value bool) context.Context {
	return context.WithValue(ctx, ctxKey, value)
}

type logQueryHook struct {
	log logger.Logger
}

func (logQueryHook) BeforeQuery(ctx context.Context, _ *pg.QueryEvent) (context.Context, error) {
	return ctx, nil
}

func (qh logQueryHook) AfterQuery(ctx context.Context, event *pg.QueryEvent) error {
	enabled, ok := ctx.Value(ctxKey).(bool)
	if !ok || !enabled {
		return nil
	}

	query, err := event.FormattedQuery()
	if err != nil {
		return errors.WithStack(err)
	}

	qh.log.Debug(string(query))

	return nil
}

// New initializes a new database struct.
func New(applicationName string, cfg *config.Config) (*pg.DB, error) {
	addr := fmt.Sprintf("%s:%d", cfg.DatabaseHost, cfg.DatabasePort)
	opts := &pg.Options{
		ApplicationName: fmt.Sprintf("%s backend %s", cfg.Environment, applicationName),
		Addr:            addr,
		User:            cfg.DatabaseUser,
		Password:        cfg.DatabasePassword,
		Database:        cfg.DatabaseName,
	}

	if cfg.DatabaseSSLMode != "disable" {
		serverName := cfg.DatabaseHost
		if cfg.DatabaseSSLHost != "" {
			serverName = cfg.DatabaseSSLHost
		}
		opts.TLSConfig = &tls.Config{
			ServerName: serverName,
			// Only skip verification for localhost, in case of proxying/port
			// forwarding.
			InsecureSkipVerify: cfg.DatabaseHost == "localhost",
		}
	}

	db := pg.Connect(opts)

	// print out all queries in debug mode
	if cfg.DatabaseDebug {
		db.AddQueryHook(logQueryHook{logger.NewWithLevel("debug")})
	}

	// retry up to 5 times to ensure that the database can connect
	var err error
	for i := 0; i < cfg.DatabaseConnectRetryCount; i++ {
		_, err = db.Exec("SELECT 1")
		if err != nil {
			time.Sleep(cfg.DatabaseConnectRetryDelay)
			continue
		}
		// successfully connected
		break
	}
	if err != nil {
		return nil, errors.WithStack(err)
	}
	return db, nil
}
