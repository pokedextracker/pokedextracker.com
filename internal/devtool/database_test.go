package devtool

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParsePublishedPort(t *testing.T) {
	t.Parallel()

	for output, want := range map[string]int{
		"127.0.0.1:9876\n":            9876,
		"0.0.0.0:9877":                9877,
		"[::]:9878\n":                 9878,
		"127.0.0.1:9879\n[::]:9879\n": 9879,
	} {
		port, err := parsePublishedPort(output)
		require.NoError(t, err, output)
		assert.Equal(t, want, port, output)
	}

	for _, output := range []string{"", "nonsense", "127.0.0.1:", "127.0.0.1:0"} {
		_, err := parsePublishedPort(output)
		assert.Error(t, err, output)
	}
}

func TestLockFileWaitsAndCanBeCancelled(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "database.lock")
	unlock, err := lockFile(context.Background(), path, func() {})
	require.NoError(t, err)

	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	t.Cleanup(cancel)
	waited := false
	_, err = lockFile(ctx, path, func() { waited = true })
	require.ErrorIs(t, err, context.DeadlineExceeded)
	assert.True(t, waited, "the caller is told it's waiting")

	unlock()
	unlockAgain, err := lockFile(context.Background(), path, func() {})
	require.NoError(t, err, "the lock is free once released")
	unlockAgain()
}
