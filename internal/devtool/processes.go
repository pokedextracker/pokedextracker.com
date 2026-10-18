package devtool

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
	"time"
)

// serverStartupTimeout includes Air's first compile, which is slow with a cold
// Go build cache.
const serverStartupTimeout = 120 * time.Second

// DatabaseTarget is one database and the environment the API should treat it
// as.
type DatabaseTarget struct {
	Environment string
	Name        string
	Port        int
}

// Servers describes the development servers a start command runs. A zero port
// means that server isn't started.
type Servers struct {
	Database DatabaseTarget
	APIPort  int
	WebPort  int
	// APIURL is where the frontend dev server proxies /api.
	APIURL string
}

// ProcessManager runs the development servers, migrations, and Go tests.
type ProcessManager interface {
	Start(ctx context.Context, env Environment, mode string, servers Servers) error
	Migrate(ctx context.Context, env Environment, target DatabaseTarget, args ...string) error
	Test(ctx context.Context, env Environment, target DatabaseTarget, args ...string) error
	// E2E serves the production build on port against target, and runs
	// Playwright against it with args.
	E2E(ctx context.Context, env Environment, target DatabaseTarget, port int, args ...string) error
}

// OSProcesses runs development commands as child process groups.
type OSProcesses struct{}

func (p *OSProcesses) Start(ctx context.Context, env Environment, mode string, servers Servers) error {
	environment := append(apiEnvironment(servers.Database), serverEnvironment(servers)...)
	var err error
	switch mode {
	case startAll:
		err = runDevelopmentProcesses(ctx, env.CurrentRoot, environment, servers.APIPort)
	case startAir:
		err = runSingleProcess(ctx, env.CurrentRoot, environment, "air")
	case startAPI:
		err = runSingleProcess(ctx, env.CurrentRoot, environment, "go", "run", "./cmd/api")
	case startWeb, startWebStaging:
		err = runSingleProcess(ctx, env.CurrentRoot, environment, "pnpm", "start")
	case startPreview:
		err = runPreview(ctx, env.CurrentRoot, environment)
	default:
		return fmt.Errorf("unknown start mode %q", mode)
	}
	return serverExit(err)
}

// serverExit treats Ctrl+C as a normal way for dev servers to stop.
func serverExit(err error) error {
	if errors.Is(err, context.Canceled) {
		return nil
	}
	return err
}

func (p *OSProcesses) Migrate(ctx context.Context, env Environment, target DatabaseTarget, args ...string) error {
	commandArgs := append([]string{"run", "./cmd/migrations"}, args...)
	return runSingleProcess(ctx, env.CurrentRoot, apiEnvironment(target), "go", commandArgs...)
}

func (p *OSProcesses) Test(ctx context.Context, env Environment, target DatabaseTarget, args ...string) error {
	commandArgs := append([]string{"test"}, args...)
	return runSingleProcess(ctx, env.CurrentRoot, apiEnvironment(target), "go", commandArgs...)
}

func (p *OSProcesses) E2E(ctx context.Context, env Environment, target DatabaseTarget, port int, args ...string) error {
	root := env.CurrentRoot
	environment := append(apiEnvironment(target), "PORT="+strconv.Itoa(port))
	binary, err := buildSite(ctx, root, environment, "e2e")
	if err != nil {
		return err
	}

	// The server logs every request, which would bury Playwright's output, so
	// it goes to a file instead.
	logPath := e2eServerLog(env)
	log, err := os.Create(logPath)
	if err != nil {
		return fmt.Errorf("create e2e server log: %w", err)
	}
	defer func() { _ = log.Close() }()

	server := newProcess(root, environment, binary)
	server.Stdout = log
	server.Stderr = log
	if err := server.Start(); err != nil {
		return fmt.Errorf("start e2e server: %w", err)
	}
	serverDone := waitForProcess(server)
	if exited, err := waitForAPI(ctx, port, serverDone); err != nil {
		if !exited {
			terminateProcess(server)
			awaitTermination(server, serverDone)
		}
		return fmt.Errorf("%w (log in %s)", err, logPath)
	}

	// If the server dies, stop the tests instead of letting every remaining
	// one fail to connect.
	testsCtx, stopTests := context.WithCancel(ctx)
	defer stopTests()
	serverExited := make(chan error, 1)
	go func() {
		serverExited <- <-serverDone
		stopTests()
	}()

	tests := append(os.Environ(), "E2E_BASE_URL="+apiURL(port))
	err = runSingleProcess(testsCtx, root, tests, "pnpm", append([]string{"exec", "playwright", "test"}, args...)...)
	select {
	case <-serverExited:
		if ctx.Err() == nil {
			return fmt.Errorf("e2e server stopped during the tests; see %s", logPath)
		}
	default:
		terminateProcess(server)
		awaitTermination(server, serverExited)
	}
	return err
}

// e2eServerLog is where the e2e server's output goes, next to its binary.
func e2eServerLog(env Environment) string {
	return filepath.Join(env.CurrentRoot, "build", "e2e", "server.log")
}

// apiEnvironment points the API's config at a database. The development and
// test configs read these, and fall back to their defaults without them.
func apiEnvironment(target DatabaseTarget) []string {
	values := append([]string{}, os.Environ()...)
	if target.Name == "" {
		return values
	}
	return append(values,
		"ENVIRONMENT="+target.Environment,
		"DATABASE_HOST=127.0.0.1",
		"DATABASE_PORT="+strconv.Itoa(target.Port),
		"DATABASE_NAME="+target.Name,
		"TZ=UTC",
	)
}

// serverEnvironment passes the chosen ports to the dev servers: PORT to the
// API's config, and WEB_PORT and API_URL to webpack.config.js.
func serverEnvironment(servers Servers) []string {
	var values []string
	if servers.APIPort != 0 {
		values = append(values, "PORT="+strconv.Itoa(servers.APIPort))
		// The dev API logs its queries unless DATABASE_DEBUG says otherwise.
		if os.Getenv("DATABASE_DEBUG") == "" {
			values = append(values, "DATABASE_DEBUG=true")
		}
	}
	if servers.WebPort != 0 {
		values = append(values, "WEB_PORT="+strconv.Itoa(servers.WebPort))
	}
	if servers.APIURL != "" {
		values = append(values, "API_URL="+servers.APIURL)
	}
	return values
}

// runPreview builds the site and runs the binary.
func runPreview(ctx context.Context, root string, environment []string) error {
	binary, err := buildSite(ctx, root, environment, "preview")
	if err != nil {
		return err
	}
	return runSingleProcess(ctx, root, environment, binary)
}

// buildSite builds the frontend for production into internal/webapp/dist,
// then the binary that embeds it, and returns the binary's path. name is the
// version the frontend reports and the build directory.
func buildSite(ctx context.Context, root string, environment []string, name string) (string, error) {
	build := append(append([]string{}, environment...), "NODE_ENV=production", "VERSION="+name)
	if err := runSingleProcess(ctx, root, build, "pnpm", "build"); err != nil {
		return "", err
	}
	binary := filepath.Join(root, "build", name, "api")
	if err := runSingleProcess(ctx, root, environment, "go", "build", "-o", binary, "./cmd/api"); err != nil {
		return "", err
	}
	return binary, nil
}

// runDevelopmentProcesses starts the API under Air, waits for it to answer its
// health check, then starts the frontend dev server. Either exiting stops the
// other.
func runDevelopmentProcesses(ctx context.Context, root string, environment []string, apiPort int) error {
	api := newProcess(root, environment, "air")
	if err := api.Start(); err != nil {
		return fmt.Errorf("start API: %w", err)
	}
	apiDone := waitForProcess(api)
	apiExited, err := waitForAPI(ctx, apiPort, apiDone)
	if err != nil {
		if !apiExited {
			terminateProcess(api)
			awaitTermination(api, apiDone)
		}
		if errors.Is(err, context.Canceled) {
			return nil
		}
		return err
	}

	web := newProcess(root, environment, "pnpm", "start")
	if err := web.Start(); err != nil {
		terminateProcess(api)
		awaitTermination(api, apiDone)
		return fmt.Errorf("start web server: %w", err)
	}
	webDone := waitForProcess(web)

	// Either exiting stops both groups, including anything left in the one
	// that exited, like the binary Air was running.
	select {
	case err := <-apiDone:
		terminateProcess(api)
		terminateProcess(web)
		awaitTermination(web, webDone)
		return processExitError("API", err)
	case err := <-webDone:
		terminateProcess(web)
		terminateProcess(api)
		awaitTermination(api, apiDone)
		return processExitError("web server", err)
	case <-ctx.Done():
		terminateProcess(api)
		terminateProcess(web)
		awaitTermination(api, apiDone)
		awaitTermination(web, webDone)
		return nil
	}
}

func runSingleProcess(ctx context.Context, root string, environment []string, name string, args ...string) error {
	command := newProcess(root, environment, name, args...)
	if err := command.Start(); err != nil {
		return fmt.Errorf("start %s: %w", name, err)
	}
	done := waitForProcess(command)
	select {
	case err := <-done:
		return processExitError(name, err)
	case <-ctx.Done():
		terminateProcess(command)
		awaitTermination(command, done)
		// One-shot commands like tests and migrations didn't finish, so this
		// is an error. Start treats it as a normal stop.
		return ctx.Err()
	}
}

// newProcess starts the command in its own process group so stopping it also
// stops anything it spawned, like the binary Air rebuilds.
func newProcess(root string, environment []string, name string, args ...string) *exec.Cmd {
	command := exec.Command(name, args...)
	command.Dir = root
	command.Env = environment
	command.Stdin = os.Stdin
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	command.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	return command
}

func waitForProcess(command *exec.Cmd) <-chan error {
	done := make(chan error, 1)
	go func() {
		done <- command.Wait()
	}()
	return done
}

func terminateProcess(command *exec.Cmd) {
	if command != nil && command.Process != nil {
		_ = syscall.Kill(-command.Process.Pid, syscall.SIGTERM)
	}
}

func awaitTermination(command *exec.Cmd, done <-chan error) {
	select {
	case <-done:
		return
	case <-time.After(5 * time.Second):
		if command != nil && command.Process != nil {
			_ = syscall.Kill(-command.Process.Pid, syscall.SIGKILL)
		}
		<-done
	}
}

// waitForAPI polls the API's health check. The boolean reports whether the API
// process already exited.
func waitForAPI(ctx context.Context, port int, exited <-chan error) (bool, error) {
	deadline := time.NewTimer(serverStartupTimeout)
	defer deadline.Stop()
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()
	client := &http.Client{Timeout: 500 * time.Millisecond}
	url := fmt.Sprintf("http://127.0.0.1:%d/health", port)

	for {
		select {
		case err := <-exited:
			if err == nil {
				return true, errors.New("API exited before becoming ready")
			}
			return true, processExitError("API", err)
		case <-ctx.Done():
			return false, ctx.Err()
		case <-deadline.C:
			return false, fmt.Errorf("API did not become ready at %s within %s", url, serverStartupTimeout)
		case <-ticker.C:
			request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
			if err != nil {
				return false, fmt.Errorf("create API health request: %w", err)
			}
			response, err := client.Do(request)
			if err == nil {
				_ = response.Body.Close()
				if response.StatusCode >= 200 && response.StatusCode < 300 {
					return false, nil
				}
			}
		}
	}
}

func processExitError(name string, err error) error {
	if err == nil || errors.Is(err, context.Canceled) {
		return nil
	}
	return fmt.Errorf("%s exited: %w", name, err)
}
