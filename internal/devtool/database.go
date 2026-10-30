package devtool

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"syscall"
	"time"
)

const (
	defaultPostgresPort = 9876
	postgresUser        = "pokedex_tracker_admin"
	// The database the server always has, used for administrative commands.
	postgresAdminDatabase = "postgres"
	postgresStartAttempts = 10
)

// DatabaseManager owns the shared PostgreSQL container and the databases in it.
type DatabaseManager interface {
	// Ensure starts the shared PostgreSQL container if it isn't running and
	// returns the port it listens on.
	Ensure(context.Context, Environment) (int, error)
	Stop(context.Context, Environment) error
	Exists(context.Context, Environment, string) (bool, error)
	Create(context.Context, Environment, string) error
	Clone(context.Context, Environment, string, string) error
	Reset(context.Context, Environment, string) error
	Psql(context.Context, Environment, string) error
	// Pull exports the reference tables from the database at url into CSV
	// files in dir, using the local database for the expected columns and
	// row order.
	Pull(ctx context.Context, env Environment, url, localDatabase, dir string) ([]PulledTable, error)
	// Seed replaces the reference tables in a database with the CSV files in
	// dir, and returns warnings about local data left pointing at missing rows.
	Seed(ctx context.Context, env Environment, name, dir string) ([]string, error)
	// ReferenceData reports whether a database has been seeded.
	ReferenceData(ctx context.Context, env Environment, name string) (ReferenceStatus, error)
}

// ReferenceStatus describes a database's reference data.
type ReferenceStatus int

const (
	ReferenceSeeded ReferenceStatus = iota
	ReferenceEmpty
	// ReferenceOutdatedSchema means the database predates a schema fix the
	// seed data needs, and has to be rebuilt with mise db:reset.
	ReferenceOutdatedSchema
)

// PulledTable summarizes one table written by a pull.
type PulledTable struct {
	Name string
	Rows int
}

// DockerDatabase manages PostgreSQL through a Compose project pinned to the
// main checkout, so every worktree shares one container.
type DockerDatabase struct {
	// Stdout receives progress messages, like when the container is started.
	Stdout io.Writer
}

func (d *DockerDatabase) Ensure(ctx context.Context, env Environment) (int, error) {
	unlock, err := lockFile(ctx, filepath.Join(env.MainRoot, "tmp", "database.lock"), func() {
		d.printf("Waiting for another worktree to finish starting PostgreSQL...\n")
	})
	if err != nil {
		return 0, err
	}
	defer unlock()

	recorded, err := readPostgresPort(env.MainRoot)
	if err != nil {
		return 0, err
	}

	// A running container is the source of truth for its port, so a lost or
	// stale tmp/database.env can't point everything at the wrong one.
	port, published, err := d.publishedPort(ctx, env, recorded)
	if err != nil {
		return 0, err
	}
	if published {
		if port != recorded {
			if err := writePostgresPort(env.MainRoot, port); err != nil {
				return 0, err
			}
		}
		if d.ready(ctx, env, port) {
			return port, nil
		}
	} else {
		port = recorded
		if port == 0 || !portAvailable(port) {
			if port, err = firstAvailablePort(defaultPostgresPort); err != nil {
				return 0, fmt.Errorf("select PostgreSQL port: %w", err)
			}
			if err := writePostgresPort(env.MainRoot, port); err != nil {
				return 0, err
			}
		}
	}

	for attempt := 1; ; attempt++ {
		if ctx.Err() != nil {
			return 0, ctx.Err()
		}
		d.printf("Starting PostgreSQL on port %d...\n", port)
		command := d.composeCommand(ctx, env, port, "up", "--detach", "--wait", "postgres")
		output, startErr := command.CombinedOutput()
		if startErr == nil {
			return port, nil
		}
		if ctx.Err() != nil {
			return 0, ctx.Err()
		}
		if !portConflict(output) || attempt == postgresStartAttempts {
			return 0, fmt.Errorf("start PostgreSQL: %w: %s", startErr, strings.TrimSpace(string(output)))
		}
		port, err = firstAvailablePort(port + 1)
		if err != nil {
			return 0, err
		}
		if err := writePostgresPort(env.MainRoot, port); err != nil {
			return 0, err
		}
	}
}

// Stop stops the shared container. Its data stays in the Docker volume.
func (d *DockerDatabase) Stop(ctx context.Context, env Environment) error {
	return d.run(ctx, env, "stop PostgreSQL", "stop", "postgres")
}

// publishedPort asks Docker which host port the running container publishes.
// It reports false only when Docker says the container isn't running; any
// other failure is an error, so a hiccup can't make the launcher pick a new
// port and recreate a container other worktrees are using.
func (d *DockerDatabase) publishedPort(ctx context.Context, env Environment, recorded int) (int, bool, error) {
	if recorded == 0 {
		recorded = defaultPostgresPort
	}
	running, err := d.composeOutput(ctx, env, recorded, "ps", "--status", "running", "--quiet", "postgres")
	if err != nil {
		return 0, false, fmt.Errorf("check PostgreSQL container: %w", err)
	}
	if strings.TrimSpace(running) == "" {
		return 0, false, nil
	}
	output, err := d.composeOutput(ctx, env, recorded, "port", "postgres", "5432")
	if err != nil {
		return 0, false, fmt.Errorf("find PostgreSQL port: %w", err)
	}
	port, err := parsePublishedPort(output)
	if err != nil {
		return 0, false, err
	}
	return port, true, nil
}

// parsePublishedPort reads the port from `docker compose port` output, like
// "127.0.0.1:9876". The first line is enough, and IPv6 forms like
// "[::]:9876" work too.
func parsePublishedPort(output string) (int, error) {
	line, _, _ := strings.Cut(strings.TrimSpace(output), "\n")
	index := strings.LastIndex(line, ":")
	if index < 0 {
		return 0, fmt.Errorf("unexpected docker compose port output %q", output)
	}
	port, err := strconv.Atoi(strings.TrimSpace(line[index+1:]))
	if err != nil || port < 1 || port > 65535 {
		return 0, fmt.Errorf("unexpected docker compose port output %q", output)
	}
	return port, nil
}

func portConflict(output []byte) bool {
	message := strings.ToLower(string(output))
	return strings.Contains(message, "port is already allocated") || strings.Contains(message, "address already in use")
}

func (d *DockerDatabase) ready(ctx context.Context, env Environment, port int) bool {
	// Over TCP for the same reason as the healthcheck in compose.yaml.
	return d.composeCommand(ctx, env, port, "exec", "-T", "postgres", "pg_isready", "-h", "127.0.0.1", "-U", postgresUser).Run() == nil
}

func (d *DockerDatabase) printf(format string, values ...any) {
	if d.Stdout != nil {
		fmt.Fprintf(d.Stdout, format, values...)
	}
}

func (d *DockerDatabase) Exists(ctx context.Context, env Environment, name string) (bool, error) {
	query := "SELECT 1 FROM pg_database WHERE datname = '" + sqlLiteral(name) + "'"
	output, err := d.psqlOutput(ctx, env, "-tAc", query)
	if err != nil {
		return false, fmt.Errorf("check database %s: %w", name, err)
	}
	return strings.TrimSpace(output) == "1", nil
}

func (d *DockerDatabase) Create(ctx context.Context, env Environment, name string) error {
	return d.run(ctx, env, "create database "+name, "exec", "-T", "postgres", "createdb", "-U", postgresUser, "--template=template0", name)
}

func (d *DockerDatabase) Reset(ctx context.Context, env Environment, name string) error {
	if err := d.drop(ctx, env, name); err != nil {
		return err
	}
	return d.Create(ctx, env, name)
}

func (d *DockerDatabase) Psql(ctx context.Context, env Environment, name string) error {
	port, err := readPostgresPort(env.MainRoot)
	if err != nil {
		return err
	}
	args := []string{"exec"}
	// Docker refuses to allocate a TTY when input is piped, as in
	// `echo 'select 1' | mise psql`.
	if info, err := os.Stdin.Stat(); err == nil && info.Mode()&os.ModeCharDevice == 0 {
		args = append(args, "-T")
	}
	args = append(args, "postgres", "psql", "-U", postgresUser, "-d", name)
	command := d.composeCommand(ctx, env, port, args...)
	// psql stays in the terminal's process group so Ctrl+C cancels a query
	// instead of ending the session.
	command.SysProcAttr = nil
	command.Stdin = os.Stdin
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	err = command.Run()
	if ctx.Err() != nil {
		return ctx.Err()
	}
	return err
}

// Clone copies source into target through a staging database, so target is
// only replaced once the copy has fully restored. The old target is renamed
// aside until the new one is in place, and put back if installing fails.
func (d *DockerDatabase) Clone(ctx context.Context, env Environment, source, target string) error {
	if source == target {
		return errors.New("source and target databases are the same")
	}
	stage, err := stagingDatabaseName()
	if err != nil {
		return err
	}
	// The swap and cleanup ignore cancellation, so an interrupt can't stop
	// them halfway. Their docker commands run in their own process groups, so
	// Ctrl+C in the terminal doesn't reach them either. Cleanup is registered
	// before the staging database is created, since an interrupt can report
	// failure for a createdb that actually succeeded.
	cleanup := context.WithoutCancel(ctx)
	stagePresent := true
	defer func() {
		if stagePresent {
			_ = d.drop(cleanup, env, stage)
		}
	}()
	if err := d.Create(ctx, env, stage); err != nil {
		return fmt.Errorf("create staging database: %w", err)
	}

	if err := d.dumpAndRestore(ctx, env, source, stage); err != nil {
		return err
	}
	targetExists, err := d.Exists(ctx, env, target)
	if err != nil {
		return err
	}

	backup := ""
	if targetExists {
		if backup, err = stagingDatabaseName(); err != nil {
			return err
		}
		if err := d.disconnectAndRename(cleanup, env, target, backup); err != nil {
			return fmt.Errorf("move database %s aside: %w", target, err)
		}
	}
	if err := d.rename(cleanup, env, stage, target); err != nil {
		if backup != "" {
			if restoreErr := d.rename(cleanup, env, backup, target); restoreErr != nil {
				return errors.Join(
					fmt.Errorf("install cloned database: %w", err),
					fmt.Errorf("restore original database %s from %s: %w", target, backup, restoreErr),
				)
			}
		}
		return fmt.Errorf("install cloned database: %w", err)
	}
	stagePresent = false
	if backup != "" {
		// The clone itself succeeded, so a leftover backup is only worth a
		// warning.
		if err := d.drop(cleanup, env, backup); err != nil {
			d.printf("Warning: couldn't remove the replaced database %s: %v\n", backup, err)
		}
	}
	return nil
}

// disconnectAndRename renames a database other clients may be using. A client
// that reconnects between disconnecting and renaming makes the rename fail, so
// it's retried a few times.
func (d *DockerDatabase) disconnectAndRename(ctx context.Context, env Environment, source, target string) error {
	var err error
	for attempt := range 5 {
		if attempt > 0 {
			time.Sleep(200 * time.Millisecond)
		}
		if err = d.terminateConnections(ctx, env, source); err != nil {
			continue
		}
		if err = d.rename(ctx, env, source, target); err == nil {
			return nil
		}
	}
	return err
}

func (d *DockerDatabase) dumpAndRestore(ctx context.Context, env Environment, source, target string) error {
	port, err := readPostgresPort(env.MainRoot)
	if err != nil {
		return err
	}
	dump := d.composeCommand(ctx, env, port, "exec", "-T", "postgres", "pg_dump", "-U", postgresUser, "--format=custom", "--no-owner", "--no-privileges", "--dbname="+source)
	restore := d.composeCommand(ctx, env, port, "exec", "-T", "postgres", "pg_restore", "-U", postgresUser, "--exit-on-error", "--no-owner", "--no-privileges", "--dbname="+target)

	// An explicit pipe whose ends this process closes after starting both
	// commands. Otherwise a restore that fails early leaves this process
	// holding the read end, and pg_dump blocks forever on a full pipe.
	reader, writer, err := os.Pipe()
	if err != nil {
		return fmt.Errorf("create database dump pipe: %w", err)
	}
	var dumpErrors, restoreErrors bytes.Buffer
	dump.Stdout = writer
	dump.Stderr = &dumpErrors
	restore.Stdin = reader
	restore.Stderr = &restoreErrors

	if err := restore.Start(); err != nil {
		_ = reader.Close()
		_ = writer.Close()
		return fmt.Errorf("start database restore: %w", err)
	}
	if err := dump.Start(); err != nil {
		_ = reader.Close()
		_ = writer.Close()
		_ = restore.Process.Kill()
		_ = restore.Wait()
		return fmt.Errorf("start database dump: %w", err)
	}
	_ = reader.Close()
	_ = writer.Close()

	restoreErr := restore.Wait()
	dumpErr := dump.Wait()
	if ctx.Err() != nil {
		return ctx.Err()
	}
	// Either side failing usually makes the other fail too, so both are
	// reported: a dump error is the cause behind a "file too short" restore.
	var errs []error
	if dumpErr != nil {
		errs = append(errs, fmt.Errorf("dump database %s: %w: %s", source, dumpErr, strings.TrimSpace(dumpErrors.String())))
	}
	if restoreErr != nil {
		errs = append(errs, fmt.Errorf("restore database %s: %w: %s", target, restoreErr, strings.TrimSpace(restoreErrors.String())))
	}
	return errors.Join(errs...)
}

func (d *DockerDatabase) rename(ctx context.Context, env Environment, source, target string) error {
	_, err := d.psqlOutput(ctx, env, "-c", fmt.Sprintf("ALTER DATABASE %s RENAME TO %s", quoteIdentifier(source), quoteIdentifier(target)))
	return err
}

// drop removes a database after disconnecting its clients. PostgreSQL 9.4's
// dropdb has no --force, so connections are terminated first.
func (d *DockerDatabase) drop(ctx context.Context, env Environment, name string) error {
	if err := d.terminateConnections(ctx, env, name); err != nil {
		return fmt.Errorf("disconnect database %s: %w", name, err)
	}
	return d.run(ctx, env, "drop database "+name, "exec", "-T", "postgres", "dropdb", "-U", postgresUser, "--if-exists", name)
}

func (d *DockerDatabase) terminateConnections(ctx context.Context, env Environment, name string) error {
	query := "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '" + sqlLiteral(name) + "' AND pid <> pg_backend_pid()"
	_, err := d.psqlOutput(ctx, env, "-c", query)
	return err
}

func (d *DockerDatabase) psqlOutput(ctx context.Context, env Environment, args ...string) (string, error) {
	port, err := readPostgresPort(env.MainRoot)
	if err != nil {
		return "", err
	}
	commandArgs := append([]string{"exec", "-T", "postgres", "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", postgresUser, "-d", postgresAdminDatabase}, args...)
	output, err := d.composeCommand(ctx, env, port, commandArgs...).CombinedOutput()
	if ctx.Err() != nil {
		return "", ctx.Err()
	}
	if err != nil {
		return "", fmt.Errorf("%w: %s", err, strings.TrimSpace(string(output)))
	}
	return string(output), nil
}

// composeOutput runs a docker compose command and returns its standard
// output.
func (d *DockerDatabase) composeOutput(ctx context.Context, env Environment, port int, args ...string) (string, error) {
	return d.capture(ctx, d.composeCommand(ctx, env, port, args...), nil)
}

func (d *DockerDatabase) run(ctx context.Context, env Environment, action string, args ...string) error {
	port, err := readPostgresPort(env.MainRoot)
	if err != nil {
		return err
	}
	output, err := d.composeCommand(ctx, env, port, args...).CombinedOutput()
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if err != nil {
		return fmt.Errorf("%s: %w: %s", action, err, strings.TrimSpace(string(output)))
	}
	return nil
}

// composeCommand pins the project name and directory to the main checkout so
// every worktree drives the same container, but reads this worktree's
// compose.yaml so a main checkout that's behind doesn't break newer branches.
func (d *DockerDatabase) composeCommand(ctx context.Context, env Environment, port int, args ...string) *exec.Cmd {
	commandArgs := []string{
		"compose",
		"--project-name", env.ProjectName,
		"--project-directory", env.MainRoot,
		"--file", filepath.Join(env.CurrentRoot, "compose.yaml"),
	}
	commandArgs = append(commandArgs, args...)
	command := exec.CommandContext(ctx, "docker", commandArgs...)
	command.Dir = env.MainRoot
	command.Env = append(os.Environ(), "POSTGRES_PORT="+strconv.Itoa(port))
	// Ctrl+C only reaches the launcher, which decides what to cancel.
	command.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	return command
}

func (d *DockerDatabase) Pull(ctx context.Context, env Environment, url, localDatabase, dir string) ([]PulledTable, error) {
	connection, err := connectionEnvironment(url)
	if err != nil {
		return nil, err
	}
	// Every table is exported to a scratch directory first, so a failed export
	// never touches seeds/.
	if err := os.MkdirAll(filepath.Join(env.CurrentRoot, "tmp"), 0o755); err != nil {
		return nil, fmt.Errorf("create tmp directory: %w", err)
	}
	scratch, err := os.MkdirTemp(filepath.Join(env.CurrentRoot, "tmp"), "seeds-pull-")
	if err != nil {
		return nil, fmt.Errorf("create scratch directory: %w", err)
	}
	defer func() { _ = os.RemoveAll(scratch) }()

	var pulled []PulledTable
	for _, table := range seedTables {
		localColumns, err := d.queryLines(ctx, env, localDatabase, columnsQuery(table))
		if err != nil {
			return nil, fmt.Errorf("read local columns of %s: %w", table, err)
		}
		remoteColumns, err := d.remote(ctx, env, connection, columnsQuery(table)+";\n", "-tA")
		if err != nil {
			return nil, fmt.Errorf("read production columns of %s: %w", table, err)
		}
		if missing, extra := columnDifferences(localColumns, lines(remoteColumns)); len(missing) > 0 || len(extra) > 0 {
			return nil, fmt.Errorf("%s columns differ between production and the local schema (missing in production: %v, only in production: %v); are the migrations up to date on both?", table, missing, extra)
		}
		primaryKey, err := d.queryLines(ctx, env, localDatabase, primaryKeyQuery(table))
		if err != nil {
			return nil, fmt.Errorf("read primary key of %s: %w", table, err)
		}

		output, err := d.remote(ctx, env, connection, pullScript(table, localColumns, pullOrder(primaryKey, localColumns)))
		if err != nil {
			return nil, fmt.Errorf("export %s: %w", table, err)
		}
		if err := os.WriteFile(seedFile(scratch, table), []byte(output), 0o600); err != nil {
			return nil, fmt.Errorf("write %s: %w", table, err)
		}
		// Counts lines, which matches rows while no value spans lines.
		rows := max(strings.Count(output, "\n")-1, 0)
		pulled = append(pulled, PulledTable{Name: table, Rows: rows})
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create %s: %w", dir, err)
	}
	for _, table := range seedTables {
		if err := os.Rename(seedFile(scratch, table), seedFile(dir, table)); err != nil {
			return nil, fmt.Errorf("install %s: %w", table, err)
		}
	}
	return pulled, nil
}

// errOutdatedBoxesKey explains the one schema fix that a migration can't
// apply to databases built before it.
var errOutdatedBoxesKey = errors.New("this database was created before the boxes primary key was fixed, so it can't hold the seed data; rebuild it once with mise db:reset")

func (d *DockerDatabase) Seed(ctx context.Context, env Environment, name, dir string) ([]string, error) {
	outdated, err := d.boxesKeyOutdated(ctx, env, name)
	if err != nil {
		return nil, err
	}
	if outdated {
		return nil, errOutdatedBoxesKey
	}
	script, err := seedScript(dir)
	if err != nil {
		return nil, err
	}
	if _, err := d.psqlScript(ctx, env, name, strings.NewReader(script), "--single-transaction"); err != nil {
		return nil, fmt.Errorf("seed database %s: %w", name, err)
	}

	// The seed has committed by now, so a problem checking for orphaned local
	// data is only worth a warning.
	output, err := d.queryLines(ctx, env, name, orphansQuery)
	var dexTypes, games, captures int
	if err == nil && len(output) == 1 {
		_, err = fmt.Sscanf(output[0], "%d|%d|%d", &dexTypes, &games, &captures)
	} else if err == nil {
		err = fmt.Errorf("unexpected output %q", output)
	}
	if err != nil {
		return []string{fmt.Sprintf("couldn't check local dexes and captures against the seed data: %v", err)}, nil
	}
	var warnings []string
	if dexTypes > 0 {
		warnings = append(warnings, plural(dexTypes, "local dex uses a dex type", "local dexes use dex types")+" that aren't in the seed data")
	}
	if games > 0 {
		warnings = append(warnings, plural(games, "local dex uses a game", "local dexes use games")+" that aren't in the seed data")
	}
	if captures > 0 {
		warnings = append(warnings, plural(captures, "local capture is of a Pokémon", "local captures are of Pokémon")+" that aren't in the seed data")
	}
	return warnings, nil
}

func (d *DockerDatabase) ReferenceData(ctx context.Context, env Environment, name string) (ReferenceStatus, error) {
	outdated, err := d.boxesKeyOutdated(ctx, env, name)
	if err != nil {
		return 0, err
	}
	if outdated {
		return ReferenceOutdatedSchema, nil
	}
	output, err := d.queryLines(ctx, env, name, "SELECT EXISTS (SELECT 1 FROM pokemon)")
	if err != nil {
		return 0, fmt.Errorf("check for reference data: %w", err)
	}
	if len(output) == 1 && output[0] == "t" {
		return ReferenceSeeded, nil
	}
	return ReferenceEmpty, nil
}

// boxesKeyOutdated reports whether a database still has the boxes primary key
// from before the fix, which can't hold rows that differ only in regional.
func (d *DockerDatabase) boxesKeyOutdated(ctx context.Context, env Environment, name string) (bool, error) {
	primaryKey, err := d.queryLines(ctx, env, name, primaryKeyQuery("boxes"))
	if err != nil {
		return false, fmt.Errorf("read primary key of boxes: %w", err)
	}
	if slices.Contains(primaryKey, "regional") {
		return false, nil
	}
	return len(primaryKey) > 0, nil
}

// remote runs a psql script against another server from inside the local
// container, so no PostgreSQL client is needed on the host. The connection
// comes from libpq environment variables, never arguments, and the session is
// read-only.
func (d *DockerDatabase) remote(ctx context.Context, env Environment, connection []string, script string, args ...string) (string, error) {
	port, err := readPostgresPort(env.MainRoot)
	if err != nil {
		return "", err
	}
	environment := append(append([]string{}, connection...),
		"PGOPTIONS=-c default_transaction_read_only=on",
		"PGCONNECT_TIMEOUT=15",
	)
	commandArgs := []string{"exec", "-T"}
	for _, value := range environment {
		name, _, _ := strings.Cut(value, "=")
		commandArgs = append(commandArgs, "-e", name)
	}
	commandArgs = append(commandArgs, "postgres", "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1")
	commandArgs = append(commandArgs, args...)
	commandArgs = append(commandArgs, "-f", "-")
	command := d.composeCommand(ctx, env, port, commandArgs...)
	command.Env = append(command.Env, environment...)
	return d.capture(ctx, command, strings.NewReader(script))
}

// psqlScript runs a psql script read from stdin against a local database.
func (d *DockerDatabase) psqlScript(ctx context.Context, env Environment, name string, script io.Reader, args ...string) (string, error) {
	port, err := readPostgresPort(env.MainRoot)
	if err != nil {
		return "", err
	}
	commandArgs := append([]string{"exec", "-T", "postgres", "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", postgresUser, "-d", name}, args...)
	commandArgs = append(commandArgs, "-f", "-")
	return d.capture(ctx, d.composeCommand(ctx, env, port, commandArgs...), script)
}

// queryLines runs one query against a local database and returns its rows,
// one per line, with columns separated by "|".
func (d *DockerDatabase) queryLines(ctx context.Context, env Environment, name, query string) ([]string, error) {
	output, err := d.psqlScript(ctx, env, name, strings.NewReader(query+";\n"), "-tA")
	if err != nil {
		return nil, err
	}
	return lines(output), nil
}

// capture runs a command, optionally with stdin, and returns its stdout.
// Stderr goes into the error so psql's message is shown.
func (d *DockerDatabase) capture(ctx context.Context, command *exec.Cmd, stdin io.Reader) (string, error) {
	var stdout, stderr bytes.Buffer
	command.Stdin = stdin
	command.Stdout = &stdout
	command.Stderr = &stderr
	err := command.Run()
	if ctx.Err() != nil {
		return "", ctx.Err()
	}
	if err != nil {
		return "", fmt.Errorf("%w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return stdout.String(), nil
}

func lines(output string) []string {
	var result []string
	for line := range strings.SplitSeq(output, "\n") {
		if line = strings.TrimSpace(line); line != "" {
			result = append(result, line)
		}
	}
	return result
}

// columnDifferences compares two column lists by name.
func columnDifferences(local, remote []string) (missing, extra []string) {
	remoteSet := map[string]bool{}
	for _, column := range remote {
		remoteSet[column] = true
	}
	localSet := map[string]bool{}
	for _, column := range local {
		localSet[column] = true
		if !remoteSet[column] {
			missing = append(missing, column)
		}
	}
	for _, column := range remote {
		if !localSet[column] {
			extra = append(extra, column)
		}
	}
	return missing, extra
}

// lockFile holds an exclusive advisory lock on path until the returned
// function is called. While another process holds it, onWait is called once
// and the lock is retried until ctx is done.
func lockFile(ctx context.Context, path string, onWait func()) (func(), error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create lock directory: %w", err)
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, fmt.Errorf("open lock %s: %w", path, err)
	}
	waited := false
	for {
		err := syscall.Flock(int(file.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
		if err == nil {
			break
		}
		if !errors.Is(err, syscall.EWOULDBLOCK) {
			_ = file.Close()
			return nil, fmt.Errorf("lock %s: %w", path, err)
		}
		if !waited {
			onWait()
			waited = true
		}
		select {
		case <-ctx.Done():
			_ = file.Close()
			return nil, ctx.Err()
		case <-time.After(200 * time.Millisecond):
		}
	}
	return func() {
		_ = syscall.Flock(int(file.Fd()), syscall.LOCK_UN)
		_ = file.Close()
	}, nil
}

func stagingDatabaseName() (string, error) {
	var random [6]byte
	if _, err := rand.Read(random[:]); err != nil {
		return "", fmt.Errorf("generate staging database name: %w", err)
	}
	return "clone_stage_" + hex.EncodeToString(random[:]), nil
}

func quoteIdentifier(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}

func sqlLiteral(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}
