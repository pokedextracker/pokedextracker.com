package devtool

import (
	"bufio"
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

const (
	seedsDirectory = "seeds"
	// productionDatabaseURLEnv is read from the environment, then from the main
	// checkout's .env, so it only has to be set once for every worktree.
	productionDatabaseURLEnv = "PRODUCTION_DATABASE_URL"
)

// seedTable is one reference table copied from production. Rows are ordered by
// the table's primary key, read from the local schema, so every pull writes
// rows in the same order and diffs stay clean.
type seedTable struct {
	Name string
}

// seedTables are the reference tables, parents before children. User data
// (users, dexes, captures) is deliberately absent and is never pulled.
// game_family_dex_numbers is left out because nothing reads it anymore.
var seedTables = []seedTable{
	{Name: "game_families"},
	{Name: "games"},
	{Name: "pokemon"},
	{Name: "dex_types"},
	{Name: "dex_types_pokemon"},
	{Name: "boxes"},
	{Name: "locations"},
	{Name: "evolutions"},
}

// seededSequences are reset after seeding so new local rows don't collide with
// seeded IDs.
var seededSequences = []struct{ Table, Sequence string }{
	{Table: "pokemon", Sequence: "pokemon_id_seq"},
	{Table: "dex_types", Sequence: "dex_types_id_seq"},
}

func seedsPath(env Environment) string {
	return filepath.Join(env.CurrentRoot, seedsDirectory)
}

func seedFile(dir string, table seedTable) string {
	return filepath.Join(dir, table.Name+".csv")
}

// hasSeeds reports whether every reference table has a seed file, so branches
// from before seeds existed are simply skipped.
func hasSeeds(dir string) bool {
	for _, table := range seedTables {
		if _, err := os.Stat(seedFile(dir, table)); err != nil {
			return false
		}
	}
	return true
}

// pullScript exports one table as CSV. The session is read-only, and the time
// zone and date style are pinned so the output doesn't depend on the server's
// settings.
func pullScript(table seedTable, columns, orderBy []string) string {
	return fmt.Sprintf(`SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;
SET TimeZone = 'UTC';
SET DateStyle = 'ISO, YMD';
COPY (SELECT %s FROM %s ORDER BY %s) TO STDOUT WITH (FORMAT csv, HEADER);
`, quoteIdentifiers(columns), quoteIdentifier(table.Name), quoteIdentifiers(orderBy))
}

// primaryKeyQuery lists a table's primary key columns in key order. It avoids
// array_position, which PostgreSQL 9.4 doesn't have.
func primaryKeyQuery(table string) string {
	return `SELECT kcu.column_name FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema AND kcu.table_name = tc.table_name
WHERE tc.table_schema = 'public' AND tc.table_name = '` + sqlLiteral(table) + `' AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY kcu.ordinal_position`
}

// columnsQuery lists a table's columns in order.
func columnsQuery(table string) string {
	return "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '" +
		sqlLiteral(table) + "' ORDER BY ordinal_position"
}

// seedScript builds one psql script that replaces every reference table from
// the seed files. psql runs it in a single transaction. Foreign key triggers
// are off for the session, so local dexes and captures that point at
// reference rows survive the replacement, and load order doesn't matter.
func seedScript(dir string) (string, error) {
	var script strings.Builder
	script.WriteString("SET session_replication_role = replica;\n")
	for i := len(seedTables) - 1; i >= 0; i-- {
		fmt.Fprintf(&script, "DELETE FROM %s;\n", quoteIdentifier(seedTables[i].Name))
	}
	for _, table := range seedTables {
		contents, err := os.ReadFile(seedFile(dir, table))
		if err != nil {
			return "", fmt.Errorf("read seed file: %w", err)
		}
		header, err := csv.NewReader(bytes.NewReader(contents)).Read()
		if err != nil {
			return "", fmt.Errorf("read header of %s: %w", seedFile(dir, table), err)
		}
		fmt.Fprintf(&script, "COPY %s (%s) FROM STDIN WITH (FORMAT csv, HEADER);\n", quoteIdentifier(table.Name), quoteIdentifiers(header))
		script.Write(contents)
		if len(contents) > 0 && contents[len(contents)-1] != '\n' {
			script.WriteByte('\n')
		}
		script.WriteString("\\.\n")
	}
	for _, sequence := range seededSequences {
		fmt.Fprintf(&script, "SELECT setval('%s', COALESCE((SELECT max(id) FROM %s), 1), (SELECT count(*) > 0 FROM %s));\n",
			sqlLiteral(sequence.Sequence), quoteIdentifier(sequence.Table), quoteIdentifier(sequence.Table))
	}
	return script.String(), nil
}

// orphansQuery counts local user data that points at reference rows that no
// longer exist after a seed.
const orphansQuery = `SELECT
  (SELECT count(*) FROM dexes d WHERE NOT EXISTS (SELECT 1 FROM dex_types t WHERE t.id = d.dex_type_id)),
  (SELECT count(*) FROM dexes d WHERE NOT EXISTS (SELECT 1 FROM games g WHERE g.id = d.game_id)),
  (SELECT count(*) FROM captures c WHERE NOT EXISTS (SELECT 1 FROM pokemon p WHERE p.id = c.pokemon_id))`

// productionDatabaseURL finds the production URL for pulls: the environment
// first, then the main checkout's .env.
func productionDatabaseURL(env Environment, getenv func(string) string) (string, error) {
	if value := getenv(productionDatabaseURLEnv); value != "" {
		return value, nil
	}
	path := filepath.Join(env.MainRoot, ".env")
	value, err := readEnvFile(path, productionDatabaseURLEnv)
	if err != nil {
		return "", err
	}
	if value == "" {
		return "", fmt.Errorf("%s isn't set; add it to %s (see README.md)", productionDatabaseURLEnv, path)
	}
	return value, nil
}

// readEnvFile returns key's value from a dotenv file, or "" if the file or key
// is missing. It handles KEY=value lines, optional "export", and quoted
// values.
func readEnvFile(path, key string) (string, error) {
	file, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("open %s: %w", path, err)
	}
	defer func() { _ = file.Close() }()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		line = strings.TrimPrefix(line, "export ")
		name, value, found := strings.Cut(line, "=")
		if !found || strings.TrimSpace(name) != key {
			continue
		}
		value = strings.TrimSpace(value)
		if len(value) >= 2 && (value[0] == '"' || value[0] == '\'') && value[len(value)-1] == value[0] {
			value = value[1 : len(value)-1]
		}
		return value, nil
	}
	if err := scanner.Err(); err != nil && !errors.Is(err, io.EOF) {
		return "", fmt.Errorf("read %s: %w", path, err)
	}
	return "", nil
}

func quoteIdentifiers(names []string) string {
	quoted := make([]string, len(names))
	for i, name := range names {
		quoted[i] = quoteIdentifier(name)
	}
	return strings.Join(quoted, ", ")
}
