package main

import (
	"context"
	"net/http"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/pkg/errors"
	"github.com/pokedextracker/pokedextracker.com/pkg/config"
	"github.com/pokedextracker/pokedextracker.com/pkg/database"
	"github.com/pokedextracker/pokedextracker.com/pkg/server"
	"github.com/robinjoseph08/golib/logger"
	"github.com/robinjoseph08/golib/signals"
)

func main() {
	log := logger.New()

	cfg, err := config.New()
	if err != nil {
		log.Err(err).Fatal("config error")
	}
	db, err := database.New("api", cfg)
	if err != nil {
		log.Err(err).Fatal("database error")
	}

	// Error reporting. Without a DSN, like in development, Sentry sends nothing.
	err = sentry.Init(sentry.ClientOptions{
		Dsn:         cfg.SentryDSN,
		Environment: cfg.Environment,
		Release:     cfg.Version,
	})
	if err != nil {
		log.Err(err).Fatal("sentry error")
	}

	srv, err := server.New(cfg, db)
	if err != nil {
		log.Err(err).Fatal("server error")
	}

	graceful := signals.Setup()

	go func() {
		log.Info("server started", logger.Data{"port": cfg.Port})
		err := srv.ListenAndServe()
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Err(err).Fatal("server stopped")
		}
		log.Info("server stopped")
	}()

	<-graceful
	log.Info("starting graceful shutdown")
	ctx := context.Background()

	err = srv.Shutdown(ctx)
	if err != nil {
		log.Err(err).Error("server shutdown error")
	}
	log.Info("server shutdown")

	err = db.Close()
	if err != nil {
		log.Err(err).Error("db close error")
	}
	log.Info("db close")

	sentry.Flush(2 * time.Second)
	log.Info("sentry flush")
}
