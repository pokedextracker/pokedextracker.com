package devtool

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
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
	// TokenNamespace keeps the frontend's login token apart from other dev
	// servers' on the same localhost port (see Environment.TokenNamespace).
	TokenNamespace string
}

// ProcessManager runs the development servers, migrations, and Go tests.
type ProcessManager interface {
	Start(ctx context.Context, env Environment, mode string, servers Servers) error
	Migrate(ctx context.Context, env Environment, target DatabaseTarget, args ...string) error
	Test(ctx context.Context, env Environment, target DatabaseTarget, args ...string) error
	// E2E serves the production build on port against target, and runs
	// Playwright against it with args.
	E2E(ctx context.Context, env Environment, target DatabaseTarget, port int, args ...string) error
	// CheckoutReference checks ref out into a temporary worktree with its
	// frontend dependencies installed.
	CheckoutReference(ctx context.Context, env Environment, ref string) (*Reference, error)
	// PrepareVisual checks that Docker is running and has the Playwright image
	// the visual comparison takes its screenshots in, pulling it if needed.
	PrepareVisual(ctx context.Context, env Environment) error
	// Visual serves the production build of site on port against target, and
	// runs the visual comparison specs from tests against it with args, as
	// side (visualReference or visualBranch). Specs that don't pass come back
	// as a *VisualFailure. Either way, it returns the tests that passed only
	// after retrying a hiccup, like a dropped connection.
	Visual(ctx context.Context, site, tests Environment, target DatabaseTarget, port int, side string, args ...string) (retried []string, err error)
}

// The two sides of a visual comparison: the ref it compares against, and this
// worktree.
const (
	visualReference = "reference"
	visualBranch    = "branch"
)

// Reference is the checkout of the ref a visual comparison compares against.
type Reference struct {
	Root   string
	Commit string
	// FetchErr is why the ref's remote branch couldn't be fetched, in which
	// case Commit is the copy fetched last time.
	FetchErr error
	// Remove deletes the checkout.
	Remove func()
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
	tests := append(os.Environ(), "E2E_BASE_URL="+apiURL(port))
	return serveAndTest(ctx, env.CurrentRoot, "e2e", e2eServerLog(env), target, port, func(ctx context.Context) error {
		return runSingleProcess(ctx, env.CurrentRoot, tests, "pnpm", append([]string{"exec", "playwright", "test"}, args...)...)
	})
}

func (p *OSProcesses) PrepareVisual(ctx context.Context, env Environment) error {
	// Asking for just the server's version keeps the error to one line.
	if err := runDocker(ctx, "version", "--format", "{{.Server.Version}}"); err != nil {
		return fmt.Errorf("the visual comparison takes its screenshots in Docker, which isn't running: %w", err)
	}
	image, err := playwrightImage(env.CurrentRoot)
	if err != nil {
		return err
	}
	if err := runDocker(ctx, "image", "inspect", image); err != nil {
		if err := runSingleProcess(ctx, env.CurrentRoot, os.Environ(), "docker", "pull", image); err != nil {
			return fmt.Errorf("pull %s: %w", image, err)
		}
	}
	return nil
}

func (p *OSProcesses) Visual(ctx context.Context, site, tests Environment, target DatabaseTarget, port int, side string, args ...string) ([]string, error) {
	logPath := filepath.Join(visualDir(tests), "server-"+side+".log")
	if err := os.MkdirAll(filepath.Dir(logPath), 0o755); err != nil {
		return nil, fmt.Errorf("create %s: %w", filepath.Dir(logPath), err)
	}
	if side == visualReference {
		// The reference side writes every screenshot again, but one whose
		// spec was removed would otherwise stay behind.
		if err := os.RemoveAll(filepath.Join(visualDir(tests), "screenshots")); err != nil {
			return nil, fmt.Errorf("clear the last screenshots: %w", err)
		}
	}
	image, err := playwrightImage(tests.CurrentRoot)
	if err != nil {
		return nil, err
	}
	// The screenshots are taken in Playwright's Linux image rather than on
	// the Mac: Chromium on macOS blends text and translucent layers slightly
	// differently from run to run, while Linux renders the same pixels every
	// time. The browsers reach the server running here through
	// host.docker.internal, and the worktree is mounted at the same path so
	// the specs, screenshots, and reports land where they would otherwise.
	root := tests.CurrentRoot
	// --mount separates its options with commas.
	if strings.Contains(root, ",") {
		return nil, fmt.Errorf("the visual comparison can't mount %s into Docker because of the comma in it", root)
	}
	// The JSON report the config writes, which says which specs didn't pass
	// and why.
	reportPath := filepath.Join(visualDir(tests), "results-"+side+".json")
	var retried []string
	runs := 0
	playwright := func(ctx context.Context, extra ...string) error {
		runs++
		// Named, so it can be removed if Ctrl+C stops the docker command
		// before the container.
		container := fmt.Sprintf("pokedextracker-visual-%d-%s-%d", os.Getpid(), side, runs)
		command := []string{"run", "--rm", "--init", "--ipc=host", "--name", container}
		// Docker Desktop hands files the container writes to the user; Docker
		// on Linux would leave them owned by root.
		if runtime.GOOS == "linux" {
			command = append(command, "--user", strconv.Itoa(os.Getuid())+":"+strconv.Itoa(os.Getgid()))
		}
		command = append(command,
			"--add-host=host.docker.internal:host-gateway",
			"--mount", "type=bind,source="+root+",target="+root,
			"--workdir", root,
			"--env", "E2E_BASE_URL=http://host.docker.internal:"+strconv.Itoa(port),
			"--env", "VISUAL_SIDE="+side,
			image,
			"node", "node_modules/@playwright/test/cli.js", "test", "--config", visualConfig,
		)
		command = append(append(command, args...), extra...)
		// A report left from an earlier run would explain the wrong one.
		if err := os.Remove(reportPath); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("remove the last visual report: %w", err)
		}
		err := runSingleProcess(ctx, root, os.Environ(), "docker", command...)
		if err == nil {
			return nil
		}
		// Removing it doesn't use ctx, so it still happens after Ctrl+C.
		_ = runDocker(context.Background(), "rm", "--force", container)
		if ctx.Err() != nil {
			return err
		}
		report, readErr := readVisualReport(reportPath)
		if readErr != nil {
			// Docker or Playwright stopped before the specs ran.
			return fmt.Errorf("run Playwright in Docker: %w", err)
		}
		retried, err = report.failure(err)
		return err
	}
	err = serveAndTest(ctx, site.CurrentRoot, "visual", logPath, target, port, func(ctx context.Context) error {
		if side != visualReference {
			return playwright(ctx)
		}
		// The reference's Playwright output directory, from the config.
		lastRun := filepath.Join(visualDir(tests), "results-"+visualReference, ".last-run.json")
		return captureReference(ctx, lastRun, playwright)
	})
	return retried, err
}

// referenceAttempts is how many times a reference screenshot that doesn't
// reproduce is taken again before the comparison gives up.
const referenceAttempts = 3

// captureReference takes the reference screenshots, then checks that taking
// them again gives the same result. A page caught mid-change (an icon a pixel
// off while the layout settles) would otherwise become the reference and make
// every comparison against it fail. Anything that doesn't reproduce is taken
// again.
//
// lastRun is the file where Playwright records which tests failed, which
// --last-failed reads.
func captureReference(ctx context.Context, lastRun string, playwright func(context.Context, ...string) error) error {
	if err := playwright(ctx, "--update-snapshots=all"); err != nil {
		return err
	}
	verify := []string{"--retries=0"}
	for attempt := 1; ; attempt++ {
		err := playwright(ctx, verify...)
		var failure *VisualFailure
		if err == nil || !errors.As(err, &failure) || attempt == referenceAttempts {
			return err
		}
		// Retake just the screenshots that didn't match or didn't get taken,
		// like after a dropped connection, then check those.
		// The retake passes, which records that nothing failed, so the list
		// of what did is put back for the check.
		failedTests, err := os.ReadFile(lastRun)
		if err != nil {
			return fmt.Errorf("read the failed reference screenshots: %w", err)
		}
		if err := playwright(ctx, "--last-failed", "--update-snapshots=all"); err != nil {
			return err
		}
		if err := os.WriteFile(lastRun, failedTests, 0o600); err != nil {
			return fmt.Errorf("restore the failed reference screenshots: %w", err)
		}
		verify = []string{"--retries=0", "--last-failed"}
	}
}

// playwrightImage is Playwright's Docker image for the Playwright installed
// in root, which has the browsers for that version.
func playwrightImage(root string) (string, error) {
	contents, err := os.ReadFile(filepath.Join(root, "node_modules", "@playwright", "test", "package.json"))
	if err != nil {
		return "", fmt.Errorf("find the installed Playwright (run mise install:web): %w", err)
	}
	var manifest struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal(contents, &manifest); err != nil || manifest.Version == "" {
		return "", fmt.Errorf("read the installed Playwright's version: %w", err)
	}
	return "mcr.microsoft.com/playwright:v" + manifest.Version, nil
}

// runDocker runs a docker command quietly. Its output is in the error.
func runDocker(ctx context.Context, args ...string) error {
	output, err := exec.CommandContext(ctx, "docker", args...).CombinedOutput()
	if err != nil {
		return fmt.Errorf("docker %s: %w: %s", strings.Join(args, " "), err, strings.TrimSpace(string(output)))
	}
	return nil
}

func (p *OSProcesses) CheckoutReference(ctx context.Context, env Environment, ref string) (*Reference, error) {
	reference := &Reference{Root: filepath.Join(visualDir(env), "reference")}
	// A remote branch is fetched first, so the comparison is against what's
	// there now. Offline, the last fetched copy is used.
	if remote, branch, ok := strings.Cut(ref, "/"); ok && remote == "origin" {
		_, reference.FetchErr = gitOutput(ctx, "-C", env.CurrentRoot, "fetch", "--quiet", remote, branch)
	}
	commit, err := gitOutput(ctx, "-C", env.CurrentRoot, "rev-parse", "--verify", ref+"^{commit}")
	if err != nil {
		return nil, fmt.Errorf("find %s: %w", ref, err)
	}
	reference.Commit = commit
	// Removing it doesn't use ctx, so it still happens after Ctrl+C.
	reference.Remove = func() {
		_, _ = gitOutput(context.Background(), "-C", env.CurrentRoot, "worktree", "remove", "--force", reference.Root)
		_, _ = gitOutput(context.Background(), "-C", env.CurrentRoot, "worktree", "prune")
	}
	// A run that was interrupted can leave the last reference behind.
	reference.Remove()
	if err := os.MkdirAll(filepath.Dir(reference.Root), 0o755); err != nil {
		return nil, fmt.Errorf("create %s: %w", filepath.Dir(reference.Root), err)
	}
	if err := runSingleProcess(ctx, env.CurrentRoot, os.Environ(), "git", "worktree", "add", "--detach", reference.Root, commit); err != nil {
		reference.Remove()
		return nil, err
	}
	// The reference is built with this worktree's tools (mise.toml), so a ref
	// from before a Node, pnpm, or Go upgrade may not install or build.
	if err := runSingleProcess(ctx, reference.Root, os.Environ(), "pnpm", "install", "--frozen-lockfile"); err != nil {
		reference.Remove()
		return nil, fmt.Errorf("install %s's dependencies (it needs to be from after the move to pnpm): %w", ref, err)
	}
	return reference, nil
}

// serveAndTest builds the site in siteRoot, serves it on port against target,
// and calls run while it's up.
func serveAndTest(ctx context.Context, siteRoot, name, logPath string, target DatabaseTarget, port int, run func(context.Context) error) error {
	// The specs set the login token under the plain key, so the build uses it
	// whatever the shell exports.
	environment := append(apiEnvironment(target), "PORT="+strconv.Itoa(port), "POKEDEXTRACKER_TOKEN_NAMESPACE=")
	binary, err := buildSite(ctx, siteRoot, environment, name)
	if err != nil {
		return err
	}

	// The server logs every request, which would bury Playwright's output, so
	// it goes to a file instead.
	log, err := os.Create(logPath)
	if err != nil {
		return fmt.Errorf("create %s server log: %w", name, err)
	}
	defer func() { _ = log.Close() }()

	server := newProcess(siteRoot, environment, binary)
	server.Stdout = log
	server.Stderr = log
	if err := server.Start(); err != nil {
		return fmt.Errorf("start %s server: %w", name, err)
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

	err = run(testsCtx)
	select {
	case <-serverExited:
		if ctx.Err() == nil {
			return fmt.Errorf("%s server stopped during the tests; see %s", name, logPath)
		}
	default:
		terminateProcess(server)
		awaitTermination(server, serverExited)
	}
	return err
}

// visualConfig is the Playwright config for the visual comparison specs.
const visualConfig = "playwright.visual.config.ts"

// visualDir holds what a visual comparison makes besides the site's builds:
// the reference worktree, screenshots, the reports, and the servers' logs.
// It's under tmp/, so none of it is committed.
func visualDir(env Environment) string {
	return filepath.Join(env.CurrentRoot, "tmp", "visual")
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
// API's config, and WEB_PORT and API_URL to vite.config.mts.
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
	// Always set, so one exported in the shell can't leak in.
	values = append(values, "POKEDEXTRACKER_TOKEN_NAMESPACE="+servers.TokenNamespace)
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
// directory under build/ the binary goes in.
func buildSite(ctx context.Context, root string, environment []string, name string) (string, error) {
	if err := runSingleProcess(ctx, root, environment, "pnpm", "build"); err != nil {
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
