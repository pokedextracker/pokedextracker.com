package devtool

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
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

func TestServerExitTreatsInterruptionAsANormalStop(t *testing.T) {
	assert.NoError(t, serverExit(context.Canceled))
	assert.NoError(t, serverExit(fmt.Errorf("air: %w", context.Canceled)))
	assert.NoError(t, serverExit(nil))

	crash := errors.New("API exited: exit status 1")
	assert.Equal(t, crash, serverExit(crash), "a server crashing is still an error")
}
