package main

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"runtime"

	"github.com/pkg/errors"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/config"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/database"
	"github.com/pokedextracker/api.pokedextracker.com/pkg/server"
	"github.com/robinjoseph08/golib/logger"
	"github.com/robinjoseph08/golib/signals"
	"github.com/rollbar/rollbar-go"
	rberrors "github.com/rollbar/rollbar-go/errors"
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
	executable, err := os.Executable()
	if err != nil {
		log.Err(err).Fatal("os executable error")
	}

	// Configure Rollbar.
	rollbar.SetToken(cfg.RollbarToken)
	rollbar.SetEnvironment(cfg.Environment)
	rollbar.SetCodeVersion(cfg.Version)
	rollbar.SetServerRoot(filepath.Dir(filepath.Dir(executable)))
	rollbar.SetStackTracer(func(err error) ([]runtime.Frame, bool) {
		// Preserve the default behavior for other types of errors.
		if trace, ok := rollbar.DefaultStackTracer(err); ok {
			return trace, ok
		}

		return rberrors.StackTracer(err)
	})

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

	rollbar.Close()
}
