package devtool

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
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
	Exists(context.Context, Environment, string) (bool, error)
	Create(context.Context, Environment, string) error
	Clone(context.Context, Environment, string, string) error
	Reset(context.Context, Environment, string) error
	Psql(context.Context, Environment, string) error
}

// DockerDatabase manages PostgreSQL through a Compose project pinned to the
// main checkout, so every worktree shares one container.
type DockerDatabase struct{}

func (d *DockerDatabase) Ensure(ctx context.Context, env Environment) (int, error) {
	unlock, err := lockFile(filepath.Join(env.MainRoot, "tmp", "database.lock"))
	if err != nil {
		return 0, err
	}
	defer unlock()

	port, err := d.preparePort(ctx, env)
	if err != nil {
		return 0, err
	}
	if d.running(ctx, env, port) {
		return port, nil
	}

	for attempt := 1; ; attempt++ {
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

// preparePort returns the recorded port, choosing a new one when none is
// recorded or when something other than our container now holds it.
func (d *DockerDatabase) preparePort(ctx context.Context, env Environment) (int, error) {
	port, err := readPostgresPort(env.MainRoot)
	if err != nil {
		return 0, err
	}
	if port != 0 && (portAvailable(port) || d.running(ctx, env, port)) {
		return port, nil
	}
	port, err = firstAvailablePort(defaultPostgresPort)
	if err != nil {
		return 0, fmt.Errorf("select PostgreSQL port: %w", err)
	}
	return port, writePostgresPort(env.MainRoot, port)
}

func portConflict(output []byte) bool {
	message := strings.ToLower(string(output))
	return strings.Contains(message, "port is already allocated") || strings.Contains(message, "address already in use")
}

func (d *DockerDatabase) running(ctx context.Context, env Environment, port int) bool {
	// Over TCP for the same reason as the healthcheck in compose.yaml.
	return d.composeCommand(ctx, env, port, "exec", "-T", "postgres", "pg_isready", "-h", "127.0.0.1", "-U", postgresUser).Run() == nil
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
	command.Stdin = os.Stdin
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	return command.Run()
}

// Clone copies source into target through a staging database, so target is
// only replaced once the copy has fully restored.
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
	stagePresent := true
	// Cleanup and the final swap run even if the command is interrupted, so a
	// half-finished clone never leaves target missing.
	background := context.Background()
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
	if targetExists {
		if err := d.drop(background, env, target); err != nil {
			return fmt.Errorf("replace database %s: %w", target, err)
		}
	}
	if err := d.rename(background, env, stage, target); err != nil {
		return fmt.Errorf("install cloned database: %w", err)
	}
	stagePresent = false
	return nil
}

func (d *DockerDatabase) dumpAndRestore(ctx context.Context, env Environment, source, target string) error {
	port, err := readPostgresPort(env.MainRoot)
	if err != nil {
		return err
	}
	dump := d.composeCommand(ctx, env, port, "exec", "-T", "postgres", "pg_dump", "-U", postgresUser, "--format=custom", "--no-owner", "--no-privileges", "--dbname="+source)
	restore := d.composeCommand(ctx, env, port, "exec", "-T", "postgres", "pg_restore", "-U", postgresUser, "--exit-on-error", "--no-owner", "--no-privileges", "--dbname="+target)

	pipe, err := dump.StdoutPipe()
	if err != nil {
		return fmt.Errorf("create database dump pipe: %w", err)
	}
	var dumpErrors, restoreErrors bytes.Buffer
	dump.Stderr = &dumpErrors
	restore.Stdin = pipe
	restore.Stderr = &restoreErrors

	if err := restore.Start(); err != nil {
		return fmt.Errorf("start database restore: %w", err)
	}
	if err := dump.Start(); err != nil {
		_ = restore.Process.Kill()
		_ = restore.Wait()
		return fmt.Errorf("start database dump: %w", err)
	}
	dumpErr := dump.Wait()
	restoreErr := restore.Wait()
	if dumpErr != nil {
		return fmt.Errorf("dump database %s: %w: %s", source, dumpErr, strings.TrimSpace(dumpErrors.String()))
	}
	if restoreErr != nil {
		return fmt.Errorf("restore database %s: %w: %s", target, restoreErr, strings.TrimSpace(restoreErrors.String()))
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
	query := "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '" + sqlLiteral(name) + "' AND pid <> pg_backend_pid()"
	if _, err := d.psqlOutput(ctx, env, "-c", query); err != nil {
		return fmt.Errorf("disconnect database %s: %w", name, err)
	}
	return d.run(ctx, env, "drop database "+name, "exec", "-T", "postgres", "dropdb", "-U", postgresUser, "--if-exists", name)
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
	return command
}

// lockFile holds an exclusive advisory lock on path until the returned
// function is called.
func lockFile(path string) (func(), error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create lock directory: %w", err)
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, fmt.Errorf("open lock %s: %w", path, err)
	}
	if err := syscall.Flock(int(file.Fd()), syscall.LOCK_EX); err != nil {
		_ = file.Close()
		return nil, fmt.Errorf("lock %s: %w", path, err)
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
