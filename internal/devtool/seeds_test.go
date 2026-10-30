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
	t.Parallel()

	for _, table := range seedTables {
		assert.NotContains(t, []string{"users", "dexes", "captures", "migrations", "migration_lock", "game_family_dex_numbers"}, table)
	}
}

func TestPullScriptIsReadOnlyAndOrdered(t *testing.T) {
	t.Parallel()

	script := pullScript("dex_types_pokemon", []string{"dex_type_id", "pokemon_id", "order"}, []string{"dex_type_id", "pokemon_id"})

	assert.Contains(t, script, "TRANSACTION READ ONLY")
	assert.Contains(t, script, "SET TimeZone = 'UTC'")
	assert.Contains(t, script, `COPY (SELECT "dex_type_id", "pokemon_id", "order" FROM "dex_types_pokemon" ORDER BY "dex_type_id", "pokemon_id") TO STDOUT WITH (FORMAT csv, HEADER);`)
}

func TestSeedScript(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	for _, table := range seedTables {
		contents := "id,name\n1,first\n"
		if table == "pokemon" {
			// A file without a trailing newline still ends its COPY cleanly.
			contents = "id,\"order\"\n1,2"
		}
		require.NoError(t, os.WriteFile(seedFile(dir, table), []byte(contents), 0o600))
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
	t.Parallel()

	dir := t.TempDir()
	assert.False(t, hasSeeds(dir))
	for _, table := range seedTables[:len(seedTables)-1] {
		require.NoError(t, os.WriteFile(seedFile(dir, table), []byte("id\n"), 0o600))
	}
	assert.False(t, hasSeeds(dir), "one table is still missing")
	require.NoError(t, os.WriteFile(seedFile(dir, seedTables[len(seedTables)-1]), []byte("id\n"), 0o600))
	assert.True(t, hasSeeds(dir))
}

func TestProductionDatabaseURL(t *testing.T) {
	t.Parallel()

	env := Environment{MainRoot: t.TempDir()}
	none := func(string) string { return "" }

	_, err := productionDatabaseURL(env, none)
	require.ErrorContains(t, err, productionDatabaseURLEnv)

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
	t.Parallel()

	missing, extra := columnDifferences([]string{"id", "name", "order"}, []string{"id", "order", "legacy"})
	assert.Equal(t, []string{"name"}, missing)
	assert.Equal(t, []string{"legacy"}, extra)

	missing, extra = columnDifferences([]string{"id"}, []string{"id"})
	assert.Empty(t, missing)
	assert.Empty(t, extra)
}

func TestPullOrderIsTotal(t *testing.T) {
	t.Parallel()

	assert.Equal(t,
		[]string{"game_family_id", "pokemon_id", "regional", "value"},
		pullOrder([]string{"game_family_id", "pokemon_id"}, []string{"game_family_id", "regional", "pokemon_id", "value"}),
		"columns outside a narrow key still break ties")
}

func TestReadEnvFileEdgeCases(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), ".env")
	require.NoError(t, os.WriteFile(path, []byte(strings.Join([]string{
		"# comment",
		"KEY=first",
		"export\tKEY=second # note",
		"OTHER=x",
		"KEY='quoted # kept'",
	}, "\r\n")), 0o600))

	value, err := readEnvFile(path, "KEY")
	require.NoError(t, err)
	assert.Equal(t, "quoted # kept", value, "the last line wins and quotes keep a #")

	require.NoError(t, os.WriteFile(path, []byte("export KEY=postgres://u:p=w@h/d # prod\n"), 0o600))
	value, err = readEnvFile(path, "KEY")
	require.NoError(t, err)
	assert.Equal(t, "postgres://u:p=w@h/d", value, "an unquoted value drops its comment and keeps =")
}

func TestConnectionEnvironment(t *testing.T) {
	t.Parallel()

	values, err := connectionEnvironment("postgres://reader:p%40ss%3Aw@db.example.com:5432/pokedex_tracker?sslmode=disable")
	require.NoError(t, err)
	assert.Equal(t, []string{
		"PGHOST=db.example.com",
		"PGDATABASE=pokedex_tracker",
		"PGUSER=reader",
		"PGPORT=5432",
		"PGPASSWORD=p@ss:w",
		"PGSSLMODE=disable",
	}, values)

	for _, bad := range []string{"pokedex_tracker", "mysql://u:p@h/d", "postgres://u:s3cr%zz@h/d", "postgres://u:p@h/", "postgres://h/d"} {
		_, err := connectionEnvironment(bad)
		require.Error(t, err, bad)
		assert.NotContains(t, err.Error(), "s3cr", "errors never echo the password")
	}
}

func TestPlural(t *testing.T) {
	t.Parallel()

	assert.Equal(t, "1 row", plural(1, "row", "rows"))
	assert.Equal(t, "0 rows", plural(0, "row", "rows"))
	assert.Equal(t, "2 rows", plural(2, "row", "rows"))
}
