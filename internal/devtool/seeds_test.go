package devtool

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSeedTablesNeverIncludeUserData(t *testing.T) {
	for _, table := range seedTables {
		assert.NotContains(t, []string{"users", "dexes", "captures", "migrations", "migration_lock"}, table.Name)
	}
}

func TestPullScriptIsReadOnlyAndOrdered(t *testing.T) {
	script := pullScript(seedTable{Name: "dex_types_pokemon"}, []string{"dex_type_id", "pokemon_id", "order"}, []string{"dex_type_id", "pokemon_id"})

	assert.Contains(t, script, "TRANSACTION READ ONLY")
	assert.Contains(t, script, "SET TimeZone = 'UTC'")
	assert.Contains(t, script, `COPY (SELECT "dex_type_id", "pokemon_id", "order" FROM "dex_types_pokemon" ORDER BY "dex_type_id", "pokemon_id") TO STDOUT WITH (FORMAT csv, HEADER);`)
}

func TestSeedScript(t *testing.T) {
	dir := t.TempDir()
	for _, table := range seedTables {
		contents := "id,name\n1,first\n"
		if table.Name == "pokemon" {
			// A file without a trailing newline still ends its COPY cleanly.
			contents = "id,\"order\"\n1,2"
		}
		require.NoError(t, os.WriteFile(seedFile(dir, table), []byte(contents), 0o644))
	}

	script, err := seedScript(dir)
	require.NoError(t, err)

	assert.True(t, strings.HasPrefix(script, "SET session_replication_role = replica;\n"))
	// Children are deleted before parents, and parents load before children.
	assert.Less(t, strings.Index(script, `DELETE FROM "evolutions"`), strings.Index(script, `DELETE FROM "game_families"`))
	assert.Less(t, strings.Index(script, `COPY "game_families"`), strings.Index(script, `COPY "evolutions"`))
	assert.Contains(t, script, "COPY \"pokemon\" (\"id\", \"order\") FROM STDIN WITH (FORMAT csv, HEADER);\nid,\"order\"\n1,2\n\\.\n")
	assert.Contains(t, script, "SELECT setval('pokemon_id_seq', COALESCE((SELECT max(id) FROM \"pokemon\"), 1), (SELECT count(*) > 0 FROM \"pokemon\"));")
	assert.Contains(t, script, "setval('dex_types_id_seq'")
}

func TestHasSeedsNeedsEveryTable(t *testing.T) {
	dir := t.TempDir()
	assert.False(t, hasSeeds(dir))
	for _, table := range seedTables[:len(seedTables)-1] {
		require.NoError(t, os.WriteFile(seedFile(dir, table), []byte("id\n"), 0o644))
	}
	assert.False(t, hasSeeds(dir), "one table is still missing")
	require.NoError(t, os.WriteFile(seedFile(dir, seedTables[len(seedTables)-1]), []byte("id\n"), 0o644))
	assert.True(t, hasSeeds(dir))
}

func TestProductionDatabaseURL(t *testing.T) {
	env := Environment{MainRoot: t.TempDir()}
	none := func(string) string { return "" }

	_, err := productionDatabaseURL(env, none)
	assert.ErrorContains(t, err, productionDatabaseURLEnv)

	require.NoError(t, os.WriteFile(filepath.Join(env.MainRoot, ".env"), []byte(
		"# Deploy secrets\nROLLBAR_TOKEN=abc\nexport PRODUCTION_DATABASE_URL=\"postgres://u:p%40ss@db:5432/pdt?sslmode=require\"\n",
	), 0o600))
	url, err := productionDatabaseURL(env, none)
	require.NoError(t, err)
	assert.Equal(t, "postgres://u:p%40ss@db:5432/pdt?sslmode=require", url, "read from the main checkout's .env")

	url, err = productionDatabaseURL(env, func(key string) string {
		if key == productionDatabaseURLEnv {
			return "postgres://from-env"
		}
		return ""
	})
	require.NoError(t, err)
	assert.Equal(t, "postgres://from-env", url, "the environment wins")
}

func TestColumnDifferences(t *testing.T) {
	missing, extra := columnDifferences([]string{"id", "name", "order"}, []string{"id", "order", "legacy"})
	assert.Equal(t, []string{"name"}, missing)
	assert.Equal(t, []string{"legacy"}, extra)

	missing, extra = columnDifferences([]string{"id"}, []string{"id"})
	assert.Empty(t, missing)
	assert.Empty(t, extra)
}
