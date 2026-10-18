// Package devtool implements the local development commands behind the mise
// tasks: a shared PostgreSQL container with a database per worktree, and dev
// servers on ports that don't collide between worktrees.
package devtool

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	defaultAPIPort = 8647
	defaultWebPort = 9898
	// The e2e server starts from its own port, so a running dev API keeps its
	// usual one.
	defaultE2EPort = 8700

	stagingURL = "https://staging.pokedextracker.com"

	startAll        = "all"
	startAir        = "air"
	startAPI        = "api"
	startWeb        = "web"
	startWebStaging = "web-staging"
	// startPreview builds the frontend for production, embeds it in the API
	// binary, and runs that binary, which serves both on one port.
	startPreview = "preview"

	// testDatabasePortEnv points the Go tests at an existing PostgreSQL server,
	// as CI does, instead of the shared Docker container.
	testDatabasePortEnv = "TEST_DATABASE_PORT"
	ciTestDatabase      = "pokedex_tracker_test"

	// e2eAll runs every browser in playwright.config.ts.
	e2eAll = "all"
)

// e2eBrowsers are the Playwright projects in playwright.config.ts.
var e2eBrowsers = []string{"chromium", "firefox", "webkit"}

var defaultTestArgs = []string{"-race", "./...", "-coverprofile", "coverage.out"}

// App implements the command interface used by mise tasks.
type App struct {
	Stdin     io.Reader
	Stdout    io.Writer
	Resolve   func(context.Context) (Environment, error)
	Database  DatabaseManager
	Ports     func(Environment) PortAllocator
	Processes ProcessManager
	Getenv    func(string) string
}

func NewApp() *App {
	return &App{
		Stdin:    os.Stdin,
		Stdout:   os.Stdout,
		Resolve:  ResolveEnvironment,
		Database: &DockerDatabase{Stdout: os.Stdout},
		Ports: func(env Environment) PortAllocator {
			return &FilePortAllocator{LockRoot: portLockRoot(env), Owner: env.CurrentRoot}
		},
		Processes: &OSProcesses{},
		Getenv:    os.Getenv,
	}
}

func (a *App) Run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		return errors.New("command is required")
	}

	env, err := a.Resolve(ctx)
	if err != nil {
		return fmt.Errorf("resolve development environment: %w", err)
	}

	switch args[0] {
	case "setup":
		return a.setup(ctx, env)
	case "start":
		return a.start(ctx, env, args[1:])
	case "db":
		return a.database(ctx, env, args[1:])
	case "clone":
		return a.clone(ctx, env, args[1:])
	case "test":
		return a.test(ctx, env, args[1:])
	case "psql":
		return a.psql(ctx, env, args[1:])
	case "e2e":
		return a.e2e(ctx, env, args[1:])
	default:
		return fmt.Errorf("unknown command %q", args[0])
	}
}

func (a *App) setup(ctx context.Context, env Environment) error {
	port, err := a.Database.Ensure(ctx, env)
	if err != nil {
		return err
	}
	if err := a.ensureDevelopmentDatabase(ctx, env, port); err != nil {
		return err
	}
	if err := a.ensureTestDatabase(ctx, env, port); err != nil {
		return err
	}
	return a.printf("Ready. Databases %s and %s are on PostgreSQL port %d.\n", env.CurrentDatabase, env.TestDatabase(), port)
}

func (a *App) start(ctx context.Context, env Environment, args []string) error {
	mode := startAll
	if len(args) > 1 {
		return errors.New("start accepts at most one mode")
	}
	if len(args) == 1 {
		mode = args[0]
	}
	switch mode {
	case startAll, startAir, startAPI, startWeb, startWebStaging, startPreview:
	default:
		return fmt.Errorf("unknown start mode %q", mode)
	}

	var servers Servers
	runsAPI := mode == startAll || mode == startAir || mode == startAPI || mode == startPreview
	runsWeb := mode == startAll || mode == startWeb || mode == startWebStaging
	ports := a.Ports(env)

	if runsAPI {
		port, err := a.Database.Ensure(ctx, env)
		if err != nil {
			return err
		}
		if err := a.ensureDevelopmentDatabase(ctx, env, port); err != nil {
			return err
		}
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := a.hintIfUnseeded(ctx, env); err != nil {
			return err
		}
		servers.Database = developmentTarget(env, port)

		lease, err := ports.Acquire(defaultAPIPort)
		if err != nil {
			return fmt.Errorf("reserve API port: %w", err)
		}
		defer func() { _ = lease.Close() }()
		servers.APIPort = lease.Port()
		forget, err := recordAPIPort(env, servers.APIPort)
		if err != nil {
			return err
		}
		defer forget()
	}

	if runsWeb {
		lease, err := ports.Acquire(defaultWebPort)
		if err != nil {
			return fmt.Errorf("reserve web port: %w", err)
		}
		defer func() { _ = lease.Close() }()
		servers.WebPort = lease.Port()

		switch {
		case mode == startWebStaging:
			servers.APIURL = stagingURL
		case servers.APIPort != 0:
			servers.APIURL = apiURL(servers.APIPort)
		default:
			// The frontend alone talks to the API this worktree is already
			// running. Guessing a port could reach another worktree's API, and
			// with it that worktree's database.
			port, err := recordedAPIPort(env)
			if err != nil {
				return err
			}
			if port == 0 {
				return errors.New("no API is running in this worktree; start one with mise start:air, run both with mise start, or use the staging API with mise start:web:staging")
			}
			servers.APIURL = apiURL(port)
		}
	}

	if servers.Database.Name != "" {
		if err := a.printf("Database: %s (PostgreSQL port %d)\n", servers.Database.Name, servers.Database.Port); err != nil {
			return err
		}
	}
	if mode == startPreview {
		if err := a.printf("Preview (production build of the frontend and API): http://localhost:%d\n", servers.APIPort); err != nil {
			return err
		}
	} else if servers.APIPort != 0 {
		if err := a.printf("API: http://localhost:%d\n", servers.APIPort); err != nil {
			return err
		}
	}
	if servers.WebPort != 0 {
		if err := a.printf("Web: http://localhost:%d (API: %s)\n", servers.WebPort, servers.APIURL); err != nil {
			return err
		}
	}
	return a.Processes.Start(ctx, env, mode, servers)
}

func (a *App) database(ctx context.Context, env Environment, args []string) error {
	if len(args) == 0 {
		return errors.New("database command must be migrate, rollback, reset, create, stop, seed, or pull")
	}
	if len(args) == 1 && args[0] == "stop" {
		return a.Database.Stop(ctx, env)
	}
	if len(args) == 1 && args[0] == "pull" {
		return a.pull(ctx, env)
	}
	if args[0] == "create" && len(args) != 2 {
		return errors.New("usage: db create <migration name>")
	}
	if args[0] != "create" && len(args) != 1 {
		return fmt.Errorf("db %s takes no arguments", args[0])
	}

	port, err := a.Database.Ensure(ctx, env)
	if err != nil {
		return err
	}
	target := developmentTarget(env, port)

	switch args[0] {
	case "migrate":
		return a.ensureDevelopmentDatabase(ctx, env, port)
	case "rollback":
		return a.Processes.Migrate(ctx, env, target, "rollback")
	case "create":
		// cmd/migrations connects before writing the file, so the database
		// has to exist, but creating a migration shouldn't apply others to an
		// existing database.
		how, err := a.createDevelopmentDatabase(ctx, env)
		if err != nil {
			return err
		}
		if err := a.setUpNewDatabase(ctx, env, port, how); err != nil {
			return err
		}
		return a.Processes.Migrate(ctx, env, target, "create", args[1])
	case "reset":
		exists, err := a.Database.Exists(ctx, env, env.CurrentDatabase)
		if err != nil {
			return err
		}
		if exists {
			confirmed, err := a.confirm(ctx, fmt.Sprintf("Reset database %s and delete all of its data?", env.CurrentDatabase))
			if err != nil {
				return err
			}
			if !confirmed {
				return a.printf("Reset cancelled.\n")
			}
		}
		if err := a.Database.Reset(ctx, env, env.CurrentDatabase); err != nil {
			return err
		}
		if err := a.Processes.Migrate(ctx, env, target, "migrate"); err != nil {
			return err
		}
		return a.seedIfAvailable(ctx, env)
	case "seed":
		if !hasSeeds(seedsPath(env)) {
			return fmt.Errorf("seed files are missing from %s; run mise db:pull first", seedsPath(env))
		}
		how, err := a.createDevelopmentDatabase(ctx, env)
		if err != nil {
			return err
		}
		// A new empty database is seeded as part of setting it up.
		if how == createdEmpty {
			return a.setUpNewDatabase(ctx, env, port, how)
		}
		if err := a.Processes.Migrate(ctx, env, target, "migrate"); err != nil {
			return err
		}
		return a.seed(ctx, env, env.CurrentDatabase)
	default:
		return fmt.Errorf("unknown database command %q", args[0])
	}
}

func (a *App) clone(ctx context.Context, env Environment, args []string) error {
	toMain := false
	for _, arg := range args {
		if arg != "--to-main" {
			return fmt.Errorf("unknown clone argument %q", arg)
		}
		toMain = true
	}
	if env.IsMain() {
		return errors.New("clone must be run from a linked worktree")
	}
	if _, err := a.Database.Ensure(ctx, env); err != nil {
		return err
	}

	source, target := env.MainDatabase, env.CurrentDatabase
	sourceLabel, targetLabel := "main", filepath.Base(env.CurrentRoot)
	if toMain {
		source, target = target, source
		sourceLabel, targetLabel = targetLabel, sourceLabel
	}
	sourceExists, err := a.Database.Exists(ctx, env, source)
	if err != nil {
		return err
	}
	if !sourceExists {
		return fmt.Errorf("source database %s does not exist", source)
	}
	targetExists, err := a.Database.Exists(ctx, env, target)
	if err != nil {
		return err
	}
	if targetExists {
		confirmed, err := a.confirm(ctx, fmt.Sprintf("Replace %s data with data from %s?", targetLabel, sourceLabel))
		if err != nil {
			return err
		}
		if !confirmed {
			return a.printf("Clone cancelled.\n")
		}
	}
	if err := a.Database.Clone(ctx, env, source, target); err != nil {
		return err
	}
	return a.printf("Cloned database from %s to %s.\n", sourceLabel, targetLabel)
}

// test runs the Go tests against this worktree's test database, or against
// the server named by TEST_DATABASE_PORT when that's set.
func (a *App) test(ctx context.Context, env Environment, args []string) error {
	if len(args) == 0 {
		args = defaultTestArgs
	}

	if value := a.Getenv(testDatabasePortEnv); value != "" {
		port, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid %s %q", testDatabasePortEnv, value)
		}
		target := DatabaseTarget{Environment: "test", Name: ciTestDatabase, Port: port}
		if err := a.Processes.Migrate(ctx, env, target, "migrate"); err != nil {
			return err
		}
		return a.Processes.Test(ctx, env, target, args...)
	}

	port, err := a.Database.Ensure(ctx, env)
	if err != nil {
		return err
	}
	if err := a.ensureTestDatabase(ctx, env, port); err != nil {
		return err
	}
	target := testTarget(env, port)
	return a.Processes.Test(ctx, env, target, args...)
}

func (a *App) psql(ctx context.Context, env Environment, args []string) error {
	test := false
	for _, arg := range args {
		if arg != "--test" {
			return fmt.Errorf("unknown psql argument %q", arg)
		}
		test = true
	}
	port, err := a.Database.Ensure(ctx, env)
	if err != nil {
		return err
	}
	// Only a database this creates gets set up, so psql shows an existing
	// database as it is, for example right after a rollback.
	if test {
		created, err := a.createTestDatabase(ctx, env)
		if err != nil {
			return err
		}
		if created {
			if err := a.Processes.Migrate(ctx, env, testTarget(env, port), "migrate"); err != nil {
				return err
			}
		}
		return a.Database.Psql(ctx, env, env.TestDatabase())
	}
	how, err := a.createDevelopmentDatabase(ctx, env)
	if err != nil {
		return err
	}
	if err := a.setUpNewDatabase(ctx, env, port, how); err != nil {
		return err
	}
	return a.Database.Psql(ctx, env, env.CurrentDatabase)
}

// e2e runs the Playwright tests against the production build of the site,
// served by the binary, the way it's deployed. The binary uses its own
// database, rebuilt from the seeds on every run, so tests start from the same
// data and never touch the development database. Arguments after the browser
// go to Playwright, like a spec file or --headed.
func (a *App) e2e(ctx context.Context, env Environment, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: e2e <%s|%s> [playwright arguments]", strings.Join(e2eBrowsers, "|"), e2eAll)
	}
	browser, playwrightArgs := args[0], args[1:]
	if browser != e2eAll {
		if !isE2EBrowser(browser) {
			return fmt.Errorf("unknown e2e browser %q; use %s or %s", browser, strings.Join(e2eBrowsers, ", "), e2eAll)
		}
		playwrightArgs = append([]string{"--project=" + browser}, playwrightArgs...)
	}
	if !hasSeeds(seedsPath(env)) {
		return fmt.Errorf("seed files are missing from %s; run mise db:pull first", seedsPath(env))
	}

	// A second run in this worktree would rebuild the database and the
	// frontend under the first one.
	unlock, err := lockFile(ctx, filepath.Join(env.CurrentRoot, "tmp", "e2e.lock"), func() {
		_ = a.printf("Waiting for another e2e run in this worktree to finish...\n")
	})
	if err != nil {
		return err
	}
	defer unlock()

	port, err := a.Database.Ensure(ctx, env)
	if err != nil {
		return err
	}
	target := e2eTarget(env, port)
	if err := a.printf("Rebuilding database %s...\n", target.Name); err != nil {
		return err
	}
	if err := a.Database.Reset(ctx, env, target.Name); err != nil {
		return err
	}
	if err := a.Processes.Migrate(ctx, env, target, "migrate"); err != nil {
		return err
	}
	if err := a.seed(ctx, env, target.Name); err != nil {
		return err
	}

	lease, err := a.Ports(env).Acquire(defaultE2EPort)
	if err != nil {
		return fmt.Errorf("reserve e2e server port: %w", err)
	}
	defer func() { _ = lease.Close() }()
	rel, err := filepath.Rel(env.CurrentRoot, e2eServerLog(env))
	if err != nil {
		return err
	}
	if err := a.printf("E2E server: %s (log in %s)\n", apiURL(lease.Port()), rel); err != nil {
		return err
	}
	return a.Processes.E2E(ctx, env, target, lease.Port(), playwrightArgs...)
}

func isE2EBrowser(name string) bool {
	for _, browser := range e2eBrowsers {
		if name == browser {
			return true
		}
	}
	return false
}

// ensureDevelopmentDatabase creates this worktree's database if needed and
// brings it up to date.
func (a *App) ensureDevelopmentDatabase(ctx context.Context, env Environment, port int) error {
	how, err := a.createDevelopmentDatabase(ctx, env)
	if err != nil {
		return err
	}
	if how == alreadyExisted {
		return a.Processes.Migrate(ctx, env, developmentTarget(env, port), "migrate")
	}
	return a.setUpNewDatabase(ctx, env, port, how)
}

// creation says how createDevelopmentDatabase found or made a database.
type creation int

const (
	alreadyExisted creation = iota
	createdEmpty
	copiedFromMain
)

// createDevelopmentDatabase creates this worktree's database the first time
// it's needed, copied from the main checkout's when that exists.
func (a *App) createDevelopmentDatabase(ctx context.Context, env Environment) (creation, error) {
	exists, err := a.Database.Exists(ctx, env, env.CurrentDatabase)
	if err != nil || exists {
		return alreadyExisted, err
	}
	mainExists := false
	if !env.IsMain() {
		mainExists, err = a.Database.Exists(ctx, env, env.MainDatabase)
		if err != nil {
			return alreadyExisted, err
		}
	}
	if !mainExists {
		return createdEmpty, a.Database.Create(ctx, env, env.CurrentDatabase)
	}
	if err := a.printf("Copying the main checkout's database into %s...\n", env.CurrentDatabase); err != nil {
		return alreadyExisted, err
	}
	if err := a.Database.Clone(ctx, env, env.MainDatabase, env.CurrentDatabase); err != nil {
		return alreadyExisted, fmt.Errorf("clone main database: %w", err)
	}
	return copiedFromMain, nil
}

// setUpNewDatabase finishes a database createDevelopmentDatabase just made:
// it migrates it, and seeds it unless it was copied from the main checkout
// (which brings its data along). Existing databases are left alone.
func (a *App) setUpNewDatabase(ctx context.Context, env Environment, port int, how creation) error {
	if how == alreadyExisted {
		return nil
	}
	if err := a.Processes.Migrate(ctx, env, developmentTarget(env, port), "migrate"); err != nil {
		return err
	}
	if how == createdEmpty {
		return a.seedIfAvailable(ctx, env)
	}
	return nil
}

// seedIfAvailable seeds this worktree's database when the branch has seed
// files, and quietly does nothing on branches from before seeds existed.
func (a *App) seedIfAvailable(ctx context.Context, env Environment) error {
	if !hasSeeds(seedsPath(env)) {
		return nil
	}
	return a.seed(ctx, env, env.CurrentDatabase)
}

func (a *App) seed(ctx context.Context, env Environment, name string) error {
	if err := a.printf("Seeding reference data into %s...\n", name); err != nil {
		return err
	}
	warnings, err := a.Database.Seed(ctx, env, name, seedsPath(env))
	if err != nil {
		return err
	}
	for _, warning := range warnings {
		if err := a.printf("Warning: %s.\n", warning); err != nil {
			return err
		}
	}
	return nil
}

func (a *App) ensureTestDatabase(ctx context.Context, env Environment, port int) error {
	if _, err := a.createTestDatabase(ctx, env); err != nil {
		return err
	}
	target := testTarget(env, port)
	return a.Processes.Migrate(ctx, env, target, "migrate")
}

// createTestDatabase creates this worktree's empty test database if it doesn't
// exist yet, and reports whether it did.
func (a *App) createTestDatabase(ctx context.Context, env Environment) (bool, error) {
	exists, err := a.Database.Exists(ctx, env, env.TestDatabase())
	if err != nil || exists {
		return false, err
	}
	return true, a.Database.Create(ctx, env, env.TestDatabase())
}

// pull refreshes the seed files from production. The local database is
// migrated first because its schema decides which columns are exported.
func (a *App) pull(ctx context.Context, env Environment) error {
	url, err := productionDatabaseURL(env, a.Getenv)
	if err != nil {
		return err
	}
	port, err := a.Database.Ensure(ctx, env)
	if err != nil {
		return err
	}
	if err := a.ensureDevelopmentDatabase(ctx, env, port); err != nil {
		return err
	}
	if err := a.printf("Pulling reference data from production...\n"); err != nil {
		return err
	}
	tables, err := a.Database.Pull(ctx, env, url, env.CurrentDatabase, seedsPath(env))
	if err != nil {
		return err
	}
	for _, table := range tables {
		if err := a.printf("  %-20s %s\n", table.Name, plural(table.Rows, "row", "rows")); err != nil {
			return err
		}
	}
	return a.printf("Wrote %s. Review the changes with git diff --stat seeds/, then commit them.\n", seedsPath(env))
}

// hintIfUnseeded points out a database without reference data instead of
// changing it behind the developer's back.
func (a *App) hintIfUnseeded(ctx context.Context, env Environment) error {
	if !hasSeeds(seedsPath(env)) {
		return nil
	}
	status, err := a.Database.ReferenceData(ctx, env, env.CurrentDatabase)
	if err != nil {
		return err
	}
	switch status {
	case ReferenceEmpty:
		return a.printf("This database has no Pokémon or games yet. Load them with mise db:seed.\n")
	case ReferenceOutdatedSchema:
		return a.printf("This database was created before the boxes primary key was fixed, so it can't hold the seed data. Rebuild it once with mise db:reset.\n")
	case ReferenceSeeded:
		return nil
	}
	return nil
}

func developmentTarget(env Environment, port int) DatabaseTarget {
	return DatabaseTarget{Environment: "development", Name: env.CurrentDatabase, Port: port}
}

func testTarget(env Environment, port int) DatabaseTarget {
	return DatabaseTarget{Environment: "test", Name: env.TestDatabase(), Port: port}
}

// e2eTarget is the database the e2e server runs against. The server runs as
// development, which turns off Rollbar and the blog proxy.
func e2eTarget(env Environment, port int) DatabaseTarget {
	return DatabaseTarget{Environment: "development", Name: env.E2EDatabase(), Port: port}
}

func apiURL(port int) string {
	return "http://127.0.0.1:" + strconv.Itoa(port)
}

func apiPortPath(env Environment) string {
	return filepath.Join(env.CurrentRoot, "tmp", "api-port")
}

// recordAPIPort leaves this worktree's API port where a separately started
// frontend can find it. Ports are chosen at start, so there is nowhere else to
// look it up.
func recordAPIPort(env Environment, port int) (func(), error) {
	path := apiPortPath(env)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create %s: %w", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(strconv.Itoa(port)), 0o600); err != nil {
		return nil, fmt.Errorf("record API port: %w", err)
	}
	return func() { _ = os.Remove(path) }, nil
}

// recordedAPIPort returns the port of the API running in this worktree, or
// zero if none is. A recorded port this worktree no longer holds the lease on
// was left behind by a launcher that didn't exit cleanly, so it's ignored.
func recordedAPIPort(env Environment) (int, error) {
	contents, err := os.ReadFile(apiPortPath(env))
	if errors.Is(err, os.ErrNotExist) {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("read API port: %w", err)
	}
	port, err := strconv.Atoi(strings.TrimSpace(string(contents)))
	if err != nil {
		return 0, fmt.Errorf("read API port: %w", err)
	}
	if !portLeasedBy(portLockRoot(env), port, env.CurrentRoot) {
		return 0, nil
	}
	return port, nil
}

func portLockRoot(env Environment) string {
	return filepath.Join(env.MainRoot, "tmp", "ports")
}

// confirm asks a yes/no question. Ctrl+C while it waits for an answer stops
// the command instead of waiting for Enter.
func (a *App) confirm(ctx context.Context, message string) (bool, error) {
	if err := a.printf("%s [y/N] ", message); err != nil {
		return false, err
	}
	type answer struct {
		line string
		err  error
	}
	answers := make(chan answer, 1)
	go func() {
		line, err := bufio.NewReader(a.Stdin).ReadString('\n')
		answers <- answer{line: line, err: err}
	}()
	select {
	case <-ctx.Done():
		return false, ctx.Err()
	case got := <-answers:
		if got.err != nil && !errors.Is(got.err, io.EOF) {
			return false, fmt.Errorf("read confirmation: %w", got.err)
		}
		reply := strings.ToLower(strings.TrimSpace(got.line))
		return reply == "y" || reply == "yes", nil
	}
}

func (a *App) printf(format string, values ...any) error {
	if _, err := fmt.Fprintf(a.Stdout, format, values...); err != nil {
		return fmt.Errorf("write command output: %w", err)
	}
	return nil
}
