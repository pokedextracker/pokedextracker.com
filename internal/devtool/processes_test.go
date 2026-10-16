package devtool

import (
	"context"
	"os"
	"os/exec"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRunSingleProcessReportsInterruption(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		time.Sleep(200 * time.Millisecond)
		cancel()
	}()

	started := time.Now()
	err := runSingleProcess(ctx, t.TempDir(), os.Environ(), "sleep", "30")

	assert.ErrorIs(t, err, context.Canceled, "an interrupted one-shot command didn't succeed")
	assert.Less(t, time.Since(started), 10*time.Second, "the child is stopped, not waited out")
}

func TestStartTreatsInterruptionAsANormalStop(t *testing.T) {
	if _, err := exec.LookPath("yarn"); err != nil {
		t.Skip("yarn isn't installed")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	env := Environment{CurrentRoot: t.TempDir()}

	// The frontend command never gets far: the context is already cancelled.
	err := (&OSProcesses{}).Start(ctx, env, startWeb, Servers{WebPort: 1})

	require.NoError(t, err)
}
