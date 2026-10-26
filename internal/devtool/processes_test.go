package devtool

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
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

func TestServerExitTreatsInterruptionAsANormalStop(t *testing.T) {
	assert.NoError(t, serverExit(context.Canceled))
	assert.NoError(t, serverExit(fmt.Errorf("air: %w", context.Canceled)))
	assert.NoError(t, serverExit(nil))

	crash := errors.New("API exited: exit status 1")
	assert.Equal(t, crash, serverExit(crash), "a server crashing is still an error")
}

// fakePlaywright stands in for Playwright taking reference screenshots: each
// run returns the next of results and records it in lastRun the way
// Playwright does, so --last-failed picks up what failed ("register"). It
// lists each run's arguments, with what --last-failed picked up.
func fakePlaywright(t *testing.T, lastRun string, results ...error) (func(context.Context, ...string) error, *[]string) {
	var runs []string
	return func(_ context.Context, args ...string) error {
		command := strings.Join(args, " ")
		if strings.Contains(command, "--last-failed") {
			recorded, err := os.ReadFile(lastRun)
			require.NoError(t, err)
			command += " (" + string(recorded) + ")"
		}
		runs = append(runs, command)
		err := results[0]
		results = results[1:]
		recorded := "none"
		if err != nil {
			recorded = "register"
		}
		require.NoError(t, os.WriteFile(lastRun, []byte(recorded), 0o644))
		return err
	}, &runs
}

func TestCaptureReferenceRetakesWhatDoesNotReproduce(t *testing.T) {
	lastRun := filepath.Join(t.TempDir(), ".last-run.json")
	playwright, runs := fakePlaywright(t, lastRun, nil, &VisualFailure{Differ: []string{"register"}}, nil, nil)

	require.NoError(t, captureReference(context.Background(), lastRun, playwright))

	assert.Equal(t, []string{
		"--update-snapshots=all",
		"--retries=0",
		"--last-failed --update-snapshots=all (register)",
		"--retries=0 --last-failed (register)",
	}, *runs)
}

func TestCaptureReferenceGivesUpOnAReferenceThatNeverReproduces(t *testing.T) {
	lastRun := filepath.Join(t.TempDir(), ".last-run.json")
	require.NoError(t, os.WriteFile(lastRun, []byte("register"), 0o644))
	runs := 0
	playwright := func(_ context.Context, args ...string) error {
		runs++
		if strings.Contains(strings.Join(args, " "), "update-snapshots") {
			return nil
		}
		return &VisualFailure{Differ: []string{"register"}}
	}

	err := captureReference(context.Background(), lastRun, playwright)

	var failure *VisualFailure
	assert.ErrorAs(t, err, &failure)
	assert.Equal(t, 1+referenceAttempts+(referenceAttempts-1), runs, "a capture, then each check, with a retake between checks")
}

func TestCaptureReferenceRetakesWhatABusyMachineCutOff(t *testing.T) {
	lastRun := filepath.Join(t.TempDir(), ".last-run.json")
	cutOff := &VisualFailure{Interrupted: []string{"register"}}
	playwright, runs := fakePlaywright(t, lastRun, cutOff, nil, &VisualFailure{Differ: []string{"register"}}, cutOff, nil, nil)

	require.NoError(t, captureReference(context.Background(), lastRun, playwright))

	assert.Equal(t, []string{
		"--update-snapshots=all",
		"--last-failed --update-snapshots=all (register)",
		"--retries=0",
		"--last-failed --update-snapshots=all (register)",
		"--last-failed --update-snapshots=all (register)",
		"--retries=0 --last-failed (register)",
	}, *runs, "what was cut off is taken again, whether it was in the first capture or a retake")
}

func TestCaptureReferenceDoesNotRetakeAFailure(t *testing.T) {
	lastRun := filepath.Join(t.TempDir(), ".last-run.json")
	playwright, runs := fakePlaywright(t, lastRun, &VisualFailure{Failed: []string{"register"}})

	err := captureReference(context.Background(), lastRun, playwright)

	var failure *VisualFailure
	assert.ErrorAs(t, err, &failure)
	assert.Equal(t, []string{"--update-snapshots=all"}, *runs, "a test that fails would only fail again")
}

func TestCaptureReferenceGivesUpOnScreenshotsItNeverTakes(t *testing.T) {
	runs := 0
	playwright := func(context.Context, ...string) error {
		runs++
		return &VisualFailure{Interrupted: []string{"register"}}
	}

	err := captureReference(context.Background(), filepath.Join(t.TempDir(), ".last-run.json"), playwright)

	var failure *VisualFailure
	assert.ErrorAs(t, err, &failure)
	assert.Equal(t, referenceAttempts, runs, "a capture, then retakes until the attempts run out")
}

func TestCaptureReferenceStopsOnOtherErrors(t *testing.T) {
	runs := 0
	playwright := func(context.Context, ...string) error {
		runs++
		if runs == 2 {
			return errors.New("docker exited: exit status 125")
		}
		return nil
	}

	err := captureReference(context.Background(), filepath.Join(t.TempDir(), ".last-run.json"), playwright)

	assert.EqualError(t, err, "docker exited: exit status 125")
	assert.Equal(t, 2, runs)
}

func TestServerEnvironmentAlwaysSetsTheTokenNamespace(t *testing.T) {
	assert.Contains(t, serverEnvironment(Servers{TokenNamespace: "feature_1a2b3c4d"}), "POKEDEXTRACKER_TOKEN_NAMESPACE=feature_1a2b3c4d")
	assert.Contains(t, serverEnvironment(Servers{}), "POKEDEXTRACKER_TOKEN_NAMESPACE=", "an empty one still overrides the shell's")
}
