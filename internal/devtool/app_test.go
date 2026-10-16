package devtool

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeDatabase struct {
	port      int
	databases map[string]bool
	calls     []string
}

func (f *fakeDatabase) Ensure(context.Context, Environment) (int, error) {
	f.calls = append(f.calls, "ensure")
	return f.port, nil
}

func (f *fakeDatabase) Stop(context.Context, Environment) error {
	f.calls = append(f.calls, "stop")
	return nil
}

func (f *fakeDatabase) Exists(_ context.Context, _ Environment, name string) (bool, error) {
	return f.databases[name], nil
}

func (f *fakeDatabase) Create(_ context.Context, _ Environment, name string) error {
	f.calls = append(f.calls, "create "+name)
	f.databases[name] = true
	return nil
}

func (f *fakeDatabase) Clone(_ context.Context, _ Environment, source, target string) error {
	f.calls = append(f.calls, "clone "+source+" "+target)
	f.databases[target] = true
	return nil
}

func (f *fakeDatabase) Reset(_ context.Context, _ Environment, name string) error {
	f.calls = append(f.calls, "reset "+name)
	return nil
}

func (f *fakeDatabase) Psql(_ context.Context, _ Environment, name string) error {
	f.calls = append(f.calls, "psql "+name)
	return nil
}

type fakeProcesses struct {
	calls   []string
	servers Servers
	mode    string
}

func (f *fakeProcesses) Start(_ context.Context, _ Environment, mode string, servers Servers) error {
	f.mode = mode
	f.servers = servers
	return nil
}

func (f *fakeProcesses) Migrate(_ context.Context, _ Environment, target DatabaseTarget, args ...string) error {
	f.calls = append(f.calls, fmt.Sprintf("migrate %s %s:%d %s", target.Environment, target.Name, target.Port, strings.Join(args, " ")))
	return nil
}

func (f *fakeProcesses) Test(_ context.Context, _ Environment, target DatabaseTarget, args ...string) error {
	f.calls = append(f.calls, fmt.Sprintf("test %s:%d %s", target.Name, target.Port, strings.Join(args, " ")))
	return nil
}

type fixedPorts struct{ next int }

type fixedLease struct{ port int }

func (l fixedLease) Port() int    { return l.port }
func (l fixedLease) Close() error { return nil }

func (p *fixedPorts) Acquire(preferred int) (PortLease, error) {
	if p.next != 0 {
		return fixedLease{port: p.next}, nil
	}
	return fixedLease{port: preferred}, nil
}

type harness struct {
	app       *App
	env       Environment
	database  *fakeDatabase
	processes *fakeProcesses
	stdout    *bytes.Buffer
	getenv    map[string]string
}

func newHarness(t *testing.T, main bool) *harness {
	t.Helper()
	root := t.TempDir()
	env := Environment{
		MainRoot:        root + "/main",
		CurrentRoot:     root + "/worktree",
		MainDatabase:    "pdt",
		CurrentDatabase: "pdt_worktree",
		ProjectName:     "pdt_1234",
	}
	if main {
		env.CurrentRoot = env.MainRoot
		env.CurrentDatabase = env.MainDatabase
	}
	h := &harness{
		env:       env,
		database:  &fakeDatabase{port: 9876, databases: map[string]bool{}},
		processes: &fakeProcesses{},
		stdout:    &bytes.Buffer{},
		getenv:    map[string]string{},
	}
	h.app = &App{
		Stdin:     strings.NewReader(""),
		Stdout:    h.stdout,
		Resolve:   func(context.Context) (Environment, error) { return env, nil },
		Database:  h.database,
		Ports:     func(Environment) PortAllocator { return &fixedPorts{} },
		Processes: h.processes,
		Getenv:    func(key string) string { return h.getenv[key] },
	}
	return h
}

func TestStartAllRunsBothServersAgainstTheWorktreeDatabase(t *testing.T) {
	h := newHarness(t, false)
	h.database.databases["pdt_worktree"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"start"}))

	assert.Equal(t, startAll, h.processes.mode)
	assert.Equal(t, DatabaseTarget{Environment: "development", Name: "pdt_worktree", Port: 9876}, h.processes.servers.Database)
	assert.Equal(t, defaultAPIPort, h.processes.servers.APIPort)
	assert.Equal(t, defaultWebPort, h.processes.servers.WebPort)
	assert.Equal(t, "http://127.0.0.1:8647", h.processes.servers.APIURL)
	assert.Equal(t, []string{"migrate development pdt_worktree:9876 migrate"}, h.processes.calls)
}

func TestStartCopiesTheMainDatabaseIntoANewWorktree(t *testing.T) {
	h := newHarness(t, false)
	h.database.databases["pdt"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"start", "air"}))

	assert.Contains(t, h.database.calls, "clone pdt pdt_worktree")
	assert.NotContains(t, h.database.calls, "create pdt_worktree")
}

func TestStartCreatesAnEmptyDatabaseWithoutAMainDatabase(t *testing.T) {
	h := newHarness(t, false)

	require.NoError(t, h.app.Run(context.Background(), []string{"start", "api"}))

	assert.Contains(t, h.database.calls, "create pdt_worktree")
	assert.Equal(t, []string{"migrate development pdt_worktree:9876 migrate"}, h.processes.calls)
}

func TestStartWebRefusesToGuessAnAPI(t *testing.T) {
	h := newHarness(t, false)

	err := h.app.Run(context.Background(), []string{"start", "web"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "no API is running in this worktree")
	assert.Empty(t, h.database.calls)
	assert.Empty(t, h.processes.mode, "nothing is started")
}

func TestStartWebUsesTheRecordedAPIPort(t *testing.T) {
	h := newHarness(t, false)
	lease, err := (&FilePortAllocator{LockRoot: portLockRoot(h.env), Owner: h.env.CurrentRoot}).Acquire(freePort(t))
	require.NoError(t, err)
	defer func() { _ = lease.Close() }()
	forget, err := recordAPIPort(h.env, lease.Port())
	require.NoError(t, err)
	defer forget()

	require.NoError(t, h.app.Run(context.Background(), []string{"start", "web"}))

	assert.Equal(t, apiURL(lease.Port()), h.processes.servers.APIURL)
}

func TestStartWebIgnoresAPortLeftByACrashedLauncher(t *testing.T) {
	h := newHarness(t, false)
	lease, err := (&FilePortAllocator{LockRoot: portLockRoot(h.env), Owner: h.env.CurrentRoot}).Acquire(freePort(t))
	require.NoError(t, err)
	forget, err := recordAPIPort(h.env, lease.Port())
	require.NoError(t, err)
	defer forget()
	// The launcher died without cleaning up: the file remains, the lease doesn't.
	require.NoError(t, lease.Close())

	err = h.app.Run(context.Background(), []string{"start", "web"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "no API is running in this worktree")
}

func TestStartWebIgnoresAPortAnotherWorktreeLeased(t *testing.T) {
	h := newHarness(t, false)
	lease, err := (&FilePortAllocator{LockRoot: portLockRoot(h.env), Owner: "/some/other/worktree"}).Acquire(freePort(t))
	require.NoError(t, err)
	defer func() { _ = lease.Close() }()
	forget, err := recordAPIPort(h.env, lease.Port())
	require.NoError(t, err)
	defer forget()

	err = h.app.Run(context.Background(), []string{"start", "web"})

	require.Error(t, err, "the port this worktree recorded now belongs to another worktree's API")
	assert.Contains(t, err.Error(), "no API is running in this worktree")
}

func TestConfirmStopsWaitingWhenInterrupted(t *testing.T) {
	h := newHarness(t, false)
	reader, writer, err := os.Pipe()
	require.NoError(t, err)
	defer func() { _ = writer.Close() }()
	h.app.Stdin = reader
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		time.Sleep(100 * time.Millisecond)
		cancel()
	}()

	_, err = h.app.confirm(ctx, "Proceed?")

	assert.ErrorIs(t, err, context.Canceled, "nobody has to press Enter after Ctrl+C")
}

func TestDatabaseStop(t *testing.T) {
	h := newHarness(t, false)

	require.NoError(t, h.app.Run(context.Background(), []string{"db", "stop"}))

	assert.Equal(t, []string{"stop"}, h.database.calls, "stopping doesn't start PostgreSQL first")
}

func TestDatabaseCreateDoesNotApplyMigrations(t *testing.T) {
	h := newHarness(t, false)
	h.database.databases["pdt_worktree"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"db", "create", "add_things"}))

	assert.Equal(t, []string{"migrate development pdt_worktree:9876 create add_things"}, h.processes.calls)
}

func TestStartWebStagingUsesTheStagingAPI(t *testing.T) {
	h := newHarness(t, false)

	require.NoError(t, h.app.Run(context.Background(), []string{"start", "web-staging"}))

	assert.Empty(t, h.database.calls)
	assert.Equal(t, stagingAPIURL, h.processes.servers.APIURL)
}

func TestStartRejectsUnknownModes(t *testing.T) {
	h := newHarness(t, false)
	assert.Error(t, h.app.Run(context.Background(), []string{"start", "everything"}))
}

func TestTestRunsAgainstTheWorktreeTestDatabase(t *testing.T) {
	h := newHarness(t, false)

	require.NoError(t, h.app.Run(context.Background(), []string{"test"}))

	assert.Contains(t, h.database.calls, "create pdt_worktree_test")
	assert.Equal(t, []string{
		"migrate test pdt_worktree_test:9876 migrate",
		"test pdt_worktree_test:9876 " + strings.Join(defaultTestArgs, " "),
	}, h.processes.calls)
}

func TestTestUsesAnExistingServerWhenTold(t *testing.T) {
	h := newHarness(t, false)
	h.getenv[testDatabasePortEnv] = "5433"

	require.NoError(t, h.app.Run(context.Background(), []string{"test", "./pkg/config"}))

	assert.Empty(t, h.database.calls, "Docker isn't touched")
	assert.Equal(t, []string{
		"migrate test pokedex_tracker_test:5433 migrate",
		"test pokedex_tracker_test:5433 ./pkg/config",
	}, h.processes.calls)
}

func TestResetAsksBeforeDeletingData(t *testing.T) {
	h := newHarness(t, false)
	h.database.databases["pdt_worktree"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"db", "reset"}))
	assert.NotContains(t, h.database.calls, "reset pdt_worktree")
	assert.Contains(t, h.stdout.String(), "Reset cancelled.")

	h.app.Stdin = strings.NewReader("y\n")
	require.NoError(t, h.app.Run(context.Background(), []string{"db", "reset"}))
	assert.Contains(t, h.database.calls, "reset pdt_worktree")
}

func TestCloneRequiresALinkedWorktree(t *testing.T) {
	h := newHarness(t, true)
	assert.Error(t, h.app.Run(context.Background(), []string{"clone"}))
}

func TestCloneToMainSwapsDirection(t *testing.T) {
	h := newHarness(t, false)
	h.database.databases["pdt_worktree"] = true
	h.app.Stdin = strings.NewReader("y\n")
	h.database.databases["pdt"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"clone", "--to-main"}))

	assert.Contains(t, h.database.calls, "clone pdt_worktree pdt")
}

func TestPsqlCreatesAndMigratesAMissingDatabase(t *testing.T) {
	h := newHarness(t, false)

	require.NoError(t, h.app.Run(context.Background(), []string{"psql", "--test"}))

	assert.Contains(t, h.database.calls, "create pdt_worktree_test")
	assert.Equal(t, []string{"migrate test pdt_worktree_test:9876 migrate"}, h.processes.calls)
	assert.Contains(t, h.database.calls, "psql pdt_worktree_test")
}

func TestPsqlLeavesAnExistingDatabaseAlone(t *testing.T) {
	h := newHarness(t, false)
	h.database.databases["pdt_worktree"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"psql"}))

	assert.Empty(t, h.processes.calls, "an existing database isn't migrated, so a rollback stays visible")
	assert.Contains(t, h.database.calls, "psql pdt_worktree")
}
