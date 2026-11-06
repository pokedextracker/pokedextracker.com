package database

import (
	"crypto/tls"
	"fmt"
	"time"

	"github.com/go-pg/pg/v10"
	"github.com/pkg/errors"
	"github.com/pokedextracker/pokedextracker.com/pkg/config"
)

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
