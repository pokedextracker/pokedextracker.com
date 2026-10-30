package devtool

import (
	"bufio"
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

const (
	seedsDirectory = "seeds"
	// productionDatabaseURLEnv is read from the environment, then from the main
	// checkout's .env, so it only has to be set once for every worktree.
	productionDatabaseURLEnv = "PRODUCTION_DATABASE_URL"
)

// seedTables are the reference tables copied from production, parents before
// children. User data (users, dexes, captures) is deliberately absent and is
// never pulled. game_family_dex_numbers is left out because nothing reads it
// anymore.
var seedTables = []string{
	"game_families",
	"games",
	"pokemon",
	"dex_types",
	"dex_types_pokemon",
	"boxes",
	"locations",
	"evolutions",
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

func seedFile(dir, table string) string {
	return filepath.Join(dir, table+".csv")
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

// pullScript exports one table as CSV. The time zone and date style are pinned
// so the output doesn't depend on the server's settings. The connection is
// already read-only through PGOPTIONS; the SET here is a deliberate second
// guard for production.
func pullScript(table string, columns, orderBy []string) string {
	return fmt.Sprintf(`SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;
SET TimeZone = 'UTC';
SET DateStyle = 'ISO, YMD';
COPY (SELECT %s FROM %s ORDER BY %s) TO STDOUT WITH (FORMAT csv, HEADER);
`, quoteIdentifiers(columns), quoteIdentifier(table), quoteIdentifiers(orderBy))
}

// pullOrder sorts by the primary key, then by every other column. The extra
// columns make the order total even if the local key is narrower than
// production's, so repeated pulls write rows in the same order.
func pullOrder(primaryKey, columns []string) []string {
	order := append([]string{}, primaryKey...)
	inKey := map[string]bool{}
	for _, column := range primaryKey {
		inKey[column] = true
	}
	for _, column := range columns {
		if !inKey[column] {
			order = append(order, column)
		}
	}
	return order
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
	for _, table := range slices.Backward(seedTables) {
		fmt.Fprintf(&script, "DELETE FROM %s;\n", quoteIdentifier(table))
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
		fmt.Fprintf(&script, "COPY %s (%s) FROM STDIN WITH (FORMAT csv, HEADER);\n", quoteIdentifier(table), quoteIdentifiers(header))
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
		return "", fmt.Errorf("%s isn't set; add it to %s (see the Data section of README.md)", productionDatabaseURLEnv, path)
	}
	return value, nil
}

// readEnvFile returns key's value from a dotenv file, or "" if the file or key
// is missing. Like dotenv, a later line wins. It handles "export", quoted
// values, and comments after unquoted values.
func readEnvFile(path, key string) (string, error) {
	file, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("open %s: %w", path, err)
	}
	defer func() { _ = file.Close() }()

	result := ""
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if rest := strings.TrimPrefix(line, "export"); rest != line && rest != "" && (rest[0] == ' ' || rest[0] == '\t') {
			line = strings.TrimSpace(rest)
		}
		name, value, found := strings.Cut(line, "=")
		if !found || strings.TrimSpace(name) != key {
			continue
		}
		result = parseEnvValue(strings.TrimSpace(value))
	}
	if err := scanner.Err(); err != nil {
		return "", fmt.Errorf("read %s: %w", path, err)
	}
	return result, nil
}

func parseEnvValue(value string) string {
	if value != "" && (value[0] == '"' || value[0] == '\'') {
		if end := strings.IndexByte(value[1:], value[0]); end >= 0 {
			return value[1 : end+1]
		}
		return value
	}
	if index := strings.Index(value, " #"); index >= 0 {
		value = value[:index]
	}
	return strings.TrimSpace(value)
}

// connectionEnvironment turns a postgres:// URL into libpq environment
// variables, so psql gets the connection without it appearing in any
// process's arguments. Errors never include the URL, since it holds the
// password.
func connectionEnvironment(rawURL string) ([]string, error) {
	invalid := fmt.Errorf("%s must look like postgres://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=disable, with special characters in the password percent-encoded", productionDatabaseURLEnv)
	parsed, err := url.Parse(rawURL)
	if err != nil || (parsed.Scheme != "postgres" && parsed.Scheme != "postgresql") || parsed.Hostname() == "" {
		return nil, invalid
	}
	database := strings.TrimPrefix(parsed.Path, "/")
	if database == "" || parsed.User == nil || parsed.User.Username() == "" {
		return nil, invalid
	}
	values := []string{
		"PGHOST=" + parsed.Hostname(),
		"PGDATABASE=" + database,
		"PGUSER=" + parsed.User.Username(),
	}
	if port := parsed.Port(); port != "" {
		values = append(values, "PGPORT="+port)
	}
	if password, ok := parsed.User.Password(); ok {
		values = append(values, "PGPASSWORD="+password)
	}
	if mode := parsed.Query().Get("sslmode"); mode != "" {
		values = append(values, "PGSSLMODE="+mode)
	}
	return values, nil
}

// plural formats a count with the singular or plural form of a noun.
func plural(count int, singular, pluralForm string) string {
	if count == 1 {
		return fmt.Sprintf("%d %s", count, singular)
	}
	return fmt.Sprintf("%d %s", count, pluralForm)
}

func quoteIdentifiers(names []string) string {
	quoted := make([]string, len(names))
	for i, name := range names {
		quoted[i] = quoteIdentifier(name)
	}
	return strings.Join(quoted, ", ")
}
