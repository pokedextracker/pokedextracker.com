package devtool

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeDatabase struct {
	port      int
	databases map[string]bool
	seeded    map[string]bool
	outdated  map[string]bool
	calls     []string
}

func (f *fakeDatabase) Pull(_ context.Context, _ Environment, url, localDatabase, dir string) ([]PulledTable, error) {
	f.calls = append(f.calls, "pull "+url+" "+localDatabase+" "+filepath.Base(dir))
	return []PulledTable{{Name: "pokemon", Rows: 3}}, nil
}

func (f *fakeDatabase) Seed(_ context.Context, _ Environment, name, dir string) ([]string, error) {
	f.calls = append(f.calls, "seed "+name+" "+filepath.Base(dir))
	f.seeded[name] = true
	return nil, nil
}

func (f *fakeDatabase) ReferenceData(_ context.Context, _ Environment, name string) (ReferenceStatus, error) {
	if f.outdated[name] {
		return ReferenceOutdatedSchema, nil
	}
	if f.seeded[name] {
		return ReferenceSeeded, nil
	}
	return ReferenceEmpty, nil
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

func (f *fakeProcesses) E2E(_ context.Context, _ Environment, target DatabaseTarget, port int, args ...string) error {
	f.calls = append(f.calls, fmt.Sprintf("e2e %s %s:%d on %d %s", target.Environment, target.Name, target.Port, port, strings.Join(args, " ")))
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
		database:  &fakeDatabase{port: 9876, databases: map[string]bool{}, seeded: map[string]bool{}, outdated: map[string]bool{}},
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
	assert.Equal(t, stagingURL, h.processes.servers.APIURL)
}

func TestStartPreviewRunsOnlyTheBinary(t *testing.T) {
	h := newHarness(t, false)
	h.database.databases["pdt_worktree"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"start", "preview"}))

	assert.Equal(t, startPreview, h.processes.mode)
	assert.Equal(t, defaultAPIPort, h.processes.servers.APIPort)
	assert.Zero(t, h.processes.servers.WebPort, "the binary serves the frontend itself")
	assert.Equal(t, "pdt_worktree", h.processes.servers.Database.Name)
	assert.Contains(t, h.stdout.String(), "Preview (production build of the frontend and API): http://localhost:8647")
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

// writeSeeds gives the harness's worktree a complete set of seed files.
func writeSeeds(t *testing.T, h *harness) {
	t.Helper()
	dir := seedsPath(h.env)
	require.NoError(t, os.MkdirAll(dir, 0o755))
	for _, table := range seedTables {
		require.NoError(t, os.WriteFile(seedFile(dir, table), []byte("id\n"), 0o600))
	}
}

func TestANewEmptyDatabaseIsSeeded(t *testing.T) {
	h := newHarness(t, false)
	writeSeeds(t, h)

	require.NoError(t, h.app.Run(context.Background(), []string{"start", "air"}))

	assert.Equal(t, []string{"ensure", "create pdt_worktree", "seed pdt_worktree seeds"}, h.database.calls)
	assert.Equal(t, []string{"migrate development pdt_worktree:9876 migrate"}, h.processes.calls, "migrated before seeding")
}

func TestADatabaseCopiedFromMainIsNotSeededAgain(t *testing.T) {
	h := newHarness(t, false)
	writeSeeds(t, h)
	h.database.databases["pdt"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"start", "air"}))

	assert.Contains(t, h.database.calls, "clone pdt pdt_worktree")
	assert.NotContains(t, h.database.calls, "seed pdt_worktree seeds")
}

func TestStartLeavesAnExistingDatabaseAloneButSaysItIsEmpty(t *testing.T) {
	h := newHarness(t, false)
	writeSeeds(t, h)
	h.database.databases["pdt_worktree"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"start", "air"}))

	assert.NotContains(t, h.database.calls, "seed pdt_worktree seeds")
	assert.Contains(t, h.stdout.String(), "Load them with mise db:seed")
}

func TestStartIsQuietWhenTheDatabaseIsSeeded(t *testing.T) {
	h := newHarness(t, false)
	writeSeeds(t, h)
	h.database.databases["pdt_worktree"] = true
	h.database.seeded["pdt_worktree"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"start", "air"}))

	assert.NotContains(t, h.stdout.String(), "mise db:seed")
}

func TestBranchesWithoutSeedsSkipSeeding(t *testing.T) {
	h := newHarness(t, false)

	require.NoError(t, h.app.Run(context.Background(), []string{"start", "air"}))

	assert.Contains(t, h.database.calls, "create pdt_worktree")
	assert.NotContains(t, strings.Join(h.database.calls, ","), "seed")
	assert.NotContains(t, h.stdout.String(), "mise db:seed")
}

func TestResetSeedsTheRecreatedDatabase(t *testing.T) {
	h := newHarness(t, false)
	writeSeeds(t, h)
	h.database.databases["pdt_worktree"] = true
	h.app.Stdin = strings.NewReader("y\n")

	require.NoError(t, h.app.Run(context.Background(), []string{"db", "reset"}))

	assert.Equal(t, []string{"ensure", "reset pdt_worktree", "seed pdt_worktree seeds"}, h.database.calls)
}

func TestSeedReloadsAnExistingDatabase(t *testing.T) {
	h := newHarness(t, false)
	writeSeeds(t, h)
	h.database.databases["pdt_worktree"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"db", "seed"}))

	assert.Equal(t, []string{"ensure", "seed pdt_worktree seeds"}, h.database.calls)
}

func TestSeedingAMissingDatabaseSeedsOnce(t *testing.T) {
	h := newHarness(t, false)
	writeSeeds(t, h)

	require.NoError(t, h.app.Run(context.Background(), []string{"db", "seed"}))

	assert.Equal(t, []string{"ensure", "create pdt_worktree", "seed pdt_worktree seeds"}, h.database.calls)
	assert.Equal(t, 1, strings.Count(h.stdout.String(), "Seeding"))
}

func TestStartPointsAnOutdatedDatabaseAtReset(t *testing.T) {
	h := newHarness(t, false)
	writeSeeds(t, h)
	h.database.databases["pdt_worktree"] = true
	h.database.outdated["pdt_worktree"] = true

	require.NoError(t, h.app.Run(context.Background(), []string{"start", "air"}))

	assert.Contains(t, h.stdout.String(), "mise db:reset")
	assert.NotContains(t, h.stdout.String(), "mise db:seed")
}

func TestSeedNeedsSeedFiles(t *testing.T) {
	h := newHarness(t, false)

	err := h.app.Run(context.Background(), []string{"db", "seed"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "run mise db:pull first")
}

func TestPullNeedsTheProductionURL(t *testing.T) {
	h := newHarness(t, false)

	err := h.app.Run(context.Background(), []string{"db", "pull"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), productionDatabaseURLEnv)
	assert.Empty(t, h.database.calls, "nothing runs without the URL")
}

func TestPullWritesSeedsForThisWorktree(t *testing.T) {
	h := newHarness(t, false)
	h.database.databases["pdt_worktree"] = true
	h.getenv[productionDatabaseURLEnv] = "postgres://prod"

	require.NoError(t, h.app.Run(context.Background(), []string{"db", "pull"}))

	assert.Contains(t, h.database.calls, "pull postgres://prod pdt_worktree seeds")
	assert.Contains(t, h.stdout.String(), "pokemon")
	assert.Contains(t, h.stdout.String(), "3 rows")
	assert.NotContains(t, h.stdout.String(), "1 rows")
}

func TestE2ERebuildsItsDatabaseAndRunsOneBrowser(t *testing.T) {
	h := newHarness(t, false)
	writeSeeds(t, h)

	require.NoError(t, h.app.Run(context.Background(), []string{"e2e", "chromium", "e2e/home.spec.ts"}))

	assert.Equal(t, []string{"ensure", "reset pdt_worktree_e2e", "seed pdt_worktree_e2e seeds"}, h.database.calls)
	assert.Equal(t, []string{
		"migrate development pdt_worktree_e2e:9876 migrate",
		"e2e development pdt_worktree_e2e:9876 on 8700 --project=chromium e2e/home.spec.ts",
	}, h.processes.calls)
}

func TestE2EAllRunsEveryBrowser(t *testing.T) {
	h := newHarness(t, false)
	writeSeeds(t, h)

	require.NoError(t, h.app.Run(context.Background(), []string{"e2e", "all"}))

	require.Len(t, h.processes.calls, 2)
	assert.NotContains(t, h.processes.calls[1], "--project", "every browser runs")
}

func TestE2ERejectsUnknownBrowsers(t *testing.T) {
	h := newHarness(t, false)
	writeSeeds(t, h)

	assert.Error(t, h.app.Run(context.Background(), []string{"e2e"}))
	assert.Error(t, h.app.Run(context.Background(), []string{"e2e", "safari"}))
	assert.Empty(t, h.database.calls)
}

func TestE2ENeedsSeedFiles(t *testing.T) {
	h := newHarness(t, false)

	err := h.app.Run(context.Background(), []string{"e2e", "chromium"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "mise db:pull")
}
