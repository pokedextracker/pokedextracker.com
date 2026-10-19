package devtool

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWorktreeDatabaseName(t *testing.T) {
	main := "/Users/robin/code/pokedextracker.com"

	assert.Equal(t, "pokedextracker_com", worktreeDatabaseName(main, main), "the main checkout uses the repository name")

	worktree := worktreeDatabaseName(main, "/Users/robin/.t3/worktrees/pokedextracker.com/t3code-3615b026")
	assert.True(t, strings.HasPrefix(worktree, "pokedextracker_com_t3code_3615b026_"), worktree)

	other := worktreeDatabaseName(main, "/Users/robin/elsewhere/t3code-3615b026")
	assert.NotEqual(t, worktree, other, "worktrees with the same directory name get different databases")
}

func TestWorktreeDatabaseNameLeavesRoomForTestSuffix(t *testing.T) {
	main := "/code/" + strings.Repeat("a", 60)
	name := worktreeDatabaseName(main, "/worktrees/"+strings.Repeat("b", 80))

	assert.LessOrEqual(t, len(name+testDatabaseSuffix), maxIdentifierLength)
	assert.LessOrEqual(t, len(name+e2eDatabaseSuffix), maxIdentifierLength)
	assert.LessOrEqual(t, len(name+visualDatabaseSuffix), maxIdentifierLength)
	assert.NotContains(t, name, "__")
}

func TestSanitizeIdentifier(t *testing.T) {
	assert.Equal(t, "pokedextracker_com", sanitizeIdentifier("PokedexTracker.com"))
	assert.Equal(t, "a_b", sanitizeIdentifier("--a  b--"))
	assert.Equal(t, "worktree", sanitizeIdentifier("---"))
	assert.Equal(t, "pok_dex", sanitizeIdentifier("Poké-dex"))
}

func TestPostgresPortRoundTrip(t *testing.T) {
	root := t.TempDir()

	port, err := readPostgresPort(root)
	require.NoError(t, err)
	assert.Zero(t, port, "no port is recorded before one is chosen")

	require.NoError(t, writePostgresPort(root, 9877))
	port, err = readPostgresPort(root)
	require.NoError(t, err)
	assert.Equal(t, 9877, port)
}

func TestReadPostgresPortRejectsGarbage(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(root, "tmp"), 0o755))
	require.NoError(t, os.WriteFile(postgresEnvironmentPath(root), []byte("POSTGRES_PORT=nope\n"), 0o600))

	_, err := readPostgresPort(root)
	assert.Error(t, err)
}
