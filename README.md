# pokedextracker.com

[![CI](https://github.com/pokedextracker/pokedextracker.com/actions/workflows/ci.yml/badge.svg)](https://github.com/pokedextracker/pokedextracker.com/actions/workflows/ci.yml)

A website to track your completion of a Living Pokedex. This repo holds both
the React frontend (`app/`) and the Go API (`cmd/` and `pkg/`).

## Setup

This repo uses [mise](https://mise.jdx.dev/) to manage tools (Go, Node.js,
pnpm, Air, golangci-lint) and tasks, and Docker to run PostgreSQL.

```sh
mise setup
```

That installs the tools and dependencies, downloads the browsers the
end-to-end tests use, starts PostgreSQL in the background, and creates and
migrates this worktree's development and test databases.

## Development

```sh
mise start              # API with hot reload, plus the frontend dev server using it
mise start:web:staging  # Just the frontend, using the staging API
mise start:preview      # The production build: one binary serving the API and frontend
mise lint               # golangci-lint, ESLint, Prettier, and TypeScript checks
mise format             # Format the code, config, and docs with Prettier
mise test:go            # Go tests
mise test:e2e           # End-to-end tests in Chromium (test:e2e:all for every browser)
mise build              # Build the frontend, then the API (which embeds it) and migrations
mise db:migrate         # Run pending migrations
mise psql               # Open psql against this worktree's database
mise db:seed            # Reload this worktree's Pokémon, games, and dexes from seeds/
mise db:stop            # Stop the shared PostgreSQL container (its data is kept)
```

Run `mise tasks` to see everything else.

The tasks go through a small dev launcher (`cmd/dev`), so several worktrees
can run at once without stepping on each other:

- **PostgreSQL** runs in one Docker container shared by every worktree. Any
  worktree starts it when it's needed, and it keeps running in the background.
  Its port (9876, or the next free one) is recorded in the main checkout's
  `tmp/database.env`.
- **Databases** are per worktree, named after the checkout's directory (for
  example `pokedextracker_com` for the main checkout). Each linked worktree
  gets its own, copied from the main checkout's the first time it's needed.
  Tests use a separate `_test` database.
- **Ports** start at 8647 for the API and 9898 for the frontend, and move up
  when another worktree or project already has them. `mise start` prints the
  URLs it picked. `mise start:web` on its own uses the API this worktree is
  running, so start one with `mise start:air` first.

Because the database and ports are chosen by the launcher, running the API or
`go test` directly (for example from an editor) won't find the database. Use
`mise start:api` and `mise test:go`, which also accepts `go test` arguments,
like `mise test:go -run TestNew ./pkg/config`.

### End-to-end tests

The end-to-end tests in `e2e/` use [Playwright](https://playwright.dev) to run
through the site in a real browser. `mise test:e2e` builds the site the way
it's deployed (one binary serving the API and the production frontend), starts
it against a separate `_e2e` database rebuilt from `seeds/` on every run, and
runs the tests in Chromium. Your development database isn't touched.
`mise setup` downloads the browsers; after a Playwright upgrade, get the new
ones with `mise install:browsers`.

```sh
mise test:e2e                     # Chromium, the quick check
mise test:e2e:all                 # Chromium, Firefox, and WebKit, like CI
mise test:e2e:webkit              # One browser (also test:e2e:firefox)
mise test:e2e -- e2e/auth.spec.ts # Arguments after -- go to Playwright
mise test:e2e -- --headed         # Watch the browser while it runs
```

Each test makes its own users through the API, so tests run in parallel and
don't depend on each other. Everything the site loads from other domains
(fonts, analytics) is blocked, and an uncaught error on the page fails the
test. When a test fails, `pnpm exec playwright show-trace` on the trace in
`test-results/` replays it step by step, and the server's log is in
`build/e2e/server.log`.

The tests use the Legends: Z-A regional dex from `seeds/`, so a `mise db:pull`
that changes that dex may mean updating them too.

If you used this repo before the launcher existed, the old setup's container
(named after the checkout, like `pokedextracker-com-postgres-1`) and its
`tmp/pgdata` directory can be deleted. Nothing carries over from them.

## Data

`seeds/` holds a copy of production's Pokémon, game, and dex data, so local
databases look like the real site. Whenever the launcher creates an empty
database (for example on `mise setup` or `mise db:reset`), it seeds it. A new
worktree copies the main checkout's database instead, data included.
`mise db:seed` reloads an existing database without touching local users or
dexes. Tests don't use seeds; they rely on their own fixtures.

Databases created before seed data existed have an outdated `boxes` primary
key and can't be seeded. `mise start` says so; rebuild them once with
`mise db:reset`.

`mise db:pull` refreshes `seeds/` from production. It needs
`PRODUCTION_DATABASE_URL` in the main checkout's `.env`:

```sh
PRODUCTION_DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE?sslmode=disable
```

Editing `seeds/` doesn't change production. See [`seeds/README.md`](seeds/README.md).

## How it's served

One Go binary serves the whole site: the API under `/api`, the frontend
(embedded into the binary from `internal/webapp/dist`) for everything else,
and `/blog`, which it forwards to the hosted Ghost blog. It also redirects
`www.` to the bare domain. Hashed JavaScript is cached forever, `index.html`
and `/version` are always revalidated, and other static files are cached for
an hour. `mise start:preview` runs this same build locally.

## Deployments

> Note: you need the necessary permissions to be able to deploy.

`mise deploy` builds a multi-arch image (`linux/amd64` and `linux/arm64`)
from the `Dockerfile`, pushes it to the GitHub Container Registry
(`ghcr.io/pokedextracker/pokedextracker.com`), uploads source maps to Rollbar,
and deploys it to the `pokedextracker-staging` app on [Fly.io](https://fly.io/).
Once you've checked staging, type `yes` at the prompt to deploy the same image
to `pokedextracker-production`. Anything else skips production. Pushing uses
your `gh` login, which needs the `write:packages` scope once:

```sh
gh auth refresh -s write:packages
mise deploy
```
