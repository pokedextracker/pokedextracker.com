package devtool

import (
	"bufio"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"unicode"
)

const (
	maxProjectIdentifierLength = 40
	// PostgreSQL truncates identifiers longer than 63 bytes.
	maxIdentifierLength = 63
	testDatabaseSuffix  = "_test"
	// The e2e and visual databases' suffixes are no longer than the test
	// database's, so names leave room for all of them.
	e2eDatabaseSuffix    = "_e2e"
	visualDatabaseSuffix = "_vis"
)

// Environment describes the repository and worktree resources used by a
// command.
type Environment struct {
	MainRoot        string
	CurrentRoot     string
	MainDatabase    string
	CurrentDatabase string
	ProjectName     string
}

// IsMain reports whether the command runs in the main checkout rather than a
// linked worktree.
func (e Environment) IsMain() bool {
	return samePath(e.MainRoot, e.CurrentRoot)
}

// TokenNamespace names where this worktree's frontend keeps its login token.
// Every worktree's dev server can end up on the same localhost port, and
// browsers keep localStorage per host and port, so worktrees would otherwise
// share a login, along with a user id from another worktree's database. The
// main checkout keeps the plain key. A linked worktree gets its directory name
// and a hash of its path, as its database name does.
func (e Environment) TokenNamespace() string {
	if e.IsMain() {
		return ""
	}
	return sanitizeIdentifier(filepath.Base(e.CurrentRoot)) + "_" + shortHash(e.CurrentRoot)
}

// TestDatabase is the database this worktree's Go tests run against.
func (e Environment) TestDatabase() string {
	return e.CurrentDatabase + testDatabaseSuffix
}

// E2EDatabase is the database the e2e tests run against. It's rebuilt on every
// run.
func (e Environment) E2EDatabase() string {
	return e.CurrentDatabase + e2eDatabaseSuffix
}

// VisualDatabase is the database the visual comparison runs against. It's
// rebuilt for each side of every comparison.
func (e Environment) VisualDatabase() string {
	return e.CurrentDatabase + visualDatabaseSuffix
}

// ResolveEnvironment finds the main checkout and current worktree from git.
func ResolveEnvironment(ctx context.Context) (Environment, error) {
	currentRoot, err := gitOutput(ctx, "rev-parse", "--show-toplevel")
	if err != nil {
		return Environment{}, err
	}
	commonDir, err := gitOutput(ctx, "rev-parse", "--path-format=absolute", "--git-common-dir")
	if err != nil {
		return Environment{}, err
	}
	mainRoot, err := filepath.EvalSymlinks(filepath.Dir(commonDir))
	if err != nil {
		return Environment{}, fmt.Errorf("resolve main worktree path: %w", err)
	}
	currentRoot, err = filepath.EvalSymlinks(currentRoot)
	if err != nil {
		return Environment{}, fmt.Errorf("resolve current worktree path: %w", err)
	}

	return Environment{
		MainRoot:        mainRoot,
		CurrentRoot:     currentRoot,
		MainDatabase:    repositoryIdentifier(mainRoot),
		CurrentDatabase: worktreeDatabaseName(mainRoot, currentRoot),
		ProjectName:     projectName(mainRoot),
	}, nil
}

func gitOutput(ctx context.Context, args ...string) (string, error) {
	command := exec.CommandContext(ctx, "git", args...)
	output, err := command.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("git %s: %w: %s", strings.Join(args, " "), err, strings.TrimSpace(string(output)))
	}
	return strings.TrimSpace(string(output)), nil
}

// worktreeDatabaseName names the main checkout's database after the repository,
// and each linked worktree's after the repository, the worktree directory, and
// a hash of its path. Room is left for the test database's suffix.
func worktreeDatabaseName(mainRoot, currentRoot string) string {
	project := repositoryIdentifier(mainRoot)
	if samePath(mainRoot, currentRoot) {
		return project
	}
	hash := shortHash(currentRoot)
	slug := sanitizeIdentifier(filepath.Base(currentRoot))
	const suffixLength = 1 + 8
	maxSlugLength := maxIdentifierLength - len(testDatabaseSuffix) - len(project) - 1 - suffixLength
	if len(slug) > maxSlugLength {
		slug = strings.TrimRight(slug[:maxSlugLength], "_")
	}
	return project + "_" + slug + "_" + hash
}

func projectName(mainRoot string) string {
	return repositoryIdentifier(mainRoot) + "_" + shortHash(mainRoot)
}

func repositoryIdentifier(root string) string {
	identifier := sanitizeIdentifier(filepath.Base(root))
	if len(identifier) > maxProjectIdentifierLength {
		identifier = strings.TrimRight(identifier[:maxProjectIdentifierLength], "_")
	}
	return identifier
}

func shortHash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:4])
}

func sanitizeIdentifier(value string) string {
	var builder strings.Builder
	lastUnderscore := false
	for _, character := range strings.ToLower(value) {
		valid := unicode.IsLetter(character) || unicode.IsDigit(character)
		if valid && character <= unicode.MaxASCII {
			builder.WriteRune(character)
			lastUnderscore = false
			continue
		}
		if !lastUnderscore && builder.Len() > 0 {
			builder.WriteByte('_')
			lastUnderscore = true
		}
	}
	result := strings.Trim(builder.String(), "_")
	if result == "" {
		return "worktree"
	}
	return result
}

func postgresEnvironmentPath(mainRoot string) string {
	return filepath.Join(mainRoot, "tmp", "database.env")
}

// readPostgresPort returns the shared PostgreSQL port recorded in the main
// checkout, or zero if none has been chosen yet.
func readPostgresPort(mainRoot string) (int, error) {
	file, err := os.Open(postgresEnvironmentPath(mainRoot))
	if os.IsNotExist(err) {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("open PostgreSQL environment: %w", err)
	}
	defer func() { _ = file.Close() }()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		key, value, found := strings.Cut(scanner.Text(), "=")
		if found && key == "POSTGRES_PORT" {
			port, err := strconv.Atoi(value)
			if err != nil || port < 1 || port > 65535 {
				return 0, fmt.Errorf("invalid POSTGRES_PORT in %s", file.Name())
			}
			return port, nil
		}
	}
	if err := scanner.Err(); err != nil {
		return 0, fmt.Errorf("read PostgreSQL environment: %w", err)
	}
	return 0, fmt.Errorf("POSTGRES_PORT is missing from %s", file.Name())
}

func writePostgresPort(mainRoot string, port int) error {
	path := postgresEnvironmentPath(mainRoot)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create PostgreSQL environment directory: %w", err)
	}
	file, err := os.CreateTemp(filepath.Dir(path), ".database-env-")
	if err != nil {
		return fmt.Errorf("create PostgreSQL environment: %w", err)
	}
	temporaryPath := file.Name()
	defer func() { _ = os.Remove(temporaryPath) }()
	if _, err := fmt.Fprintf(file, "POSTGRES_PORT=%d\n", port); err != nil {
		_ = file.Close()
		return fmt.Errorf("write PostgreSQL environment: %w", err)
	}
	if err := file.Close(); err != nil {
		return fmt.Errorf("close PostgreSQL environment: %w", err)
	}
	if err := os.Rename(temporaryPath, path); err != nil {
		return fmt.Errorf("install PostgreSQL environment: %w", err)
	}
	return nil
}

func samePath(left, right string) bool {
	leftPath, leftErr := filepath.Abs(left)
	rightPath, rightErr := filepath.Abs(right)
	return leftErr == nil && rightErr == nil && leftPath == rightPath
}
