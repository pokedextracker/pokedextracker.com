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
	port, published := d.publishedPort(ctx, env, recorded)
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
		d.printf("Starting PostgreSQL on port %d...\n", port)
		command := d.composeCommand(ctx, env, port, "up", "--detach", "--wait", "postgres")
		output, startErr := command.CombinedOutput()
		if startErr == nil {
			return port, nil
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
// It reports false when the container isn't running.
func (d *DockerDatabase) publishedPort(ctx context.Context, env Environment, recorded int) (int, bool) {
	if recorded == 0 {
		recorded = defaultPostgresPort
	}
	output, err := d.composeCommand(ctx, env, recorded, "port", "postgres", "5432").Output()
	if err != nil {
		return 0, false
	}
	_, value, found := strings.Cut(strings.TrimSpace(string(output)), ":")
	port, err := strconv.Atoi(value)
	if !found || err != nil || port == 0 {
		return 0, false
	}
	return port, true
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
	return command.Run()
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
	if err := d.Create(ctx, env, stage); err != nil {
		return fmt.Errorf("create staging database: %w", err)
	}
	// The swap and cleanup ignore cancellation, so an interrupt can't stop
	// them halfway. Their docker commands run in their own process groups, so
	// Ctrl+C in the terminal doesn't reach them either.
	background := context.Background()
	stagePresent := true
	defer func() {
		if stagePresent {
			_ = d.drop(background, env, stage)
		}
	}()

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
		if err := d.terminateConnections(background, env, target); err != nil {
			return fmt.Errorf("disconnect database %s: %w", target, err)
		}
		if err := d.rename(background, env, target, backup); err != nil {
			return fmt.Errorf("move database %s aside: %w", target, err)
		}
	}
	if err := d.rename(background, env, stage, target); err != nil {
		if backup != "" {
			if restoreErr := d.rename(background, env, backup, target); restoreErr != nil {
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
		if err := d.drop(background, env, backup); err != nil {
			return fmt.Errorf("remove replaced database %s: %w", backup, err)
		}
	}
	return nil
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
	// The restore's error explains a dump that failed because its reader went
	// away, so it's reported first.
	if restoreErr != nil {
		return fmt.Errorf("restore database %s: %w: %s", target, restoreErr, strings.TrimSpace(restoreErrors.String()))
	}
	if dumpErr != nil {
		return fmt.Errorf("dump database %s: %w: %s", source, dumpErr, strings.TrimSpace(dumpErrors.String()))
	}
	return nil
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
	if err != nil {
		return "", fmt.Errorf("%w: %s", err, strings.TrimSpace(string(output)))
	}
	return string(output), nil
}

func (d *DockerDatabase) run(ctx context.Context, env Environment, action string, args ...string) error {
	port, err := readPostgresPort(env.MainRoot)
	if err != nil {
		return err
	}
	output, err := d.composeCommand(ctx, env, port, args...).CombinedOutput()
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
