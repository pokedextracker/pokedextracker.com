package database

import (
	"testing"
	"time"

	"github.com/pokedextracker/api.pokedextracker.com/pkg/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew(t *testing.T) {
	cfg, err := config.New()
	require.NoError(t, err)
	cfg.DatabaseDebug = true

	db, err := New("database test", cfg)

	assert.NoError(t, err)
	assert.NotNil(t, db)

	cfg.DatabaseConnectRetryCount = 1
	cfg.DatabaseConnectRetryDelay = 1 * time.Millisecond
	cfg.DatabaseName = "bad_db"

	_, err = New("database test", cfg)

	assert.Error(t, err, "expected error when connection fails")
}
