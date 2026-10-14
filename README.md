# pokedextracker.com

[![CI](https://github.com/pokedextracker/pokedextracker.com/actions/workflows/ci.yml/badge.svg)](https://github.com/pokedextracker/pokedextracker.com/actions/workflows/ci.yml)

A website to track your completion of a Living Pokedex. This repo holds both
the React frontend (`app/`) and the Go API (`cmd/` and `pkg/`).

## Setup

This repo uses [mise](https://mise.jdx.dev/) to manage tools (Go, Node.js,
Yarn, Air, golangci-lint) and tasks, and Docker to run PostgreSQL.

```sh
mise setup
```

That installs the tools and dependencies, starts PostgreSQL in the background,
creates the test database, and runs migrations for both databases.

## Development

```sh
mise start          # API on port 8647 with hot reload, plus the frontend at http://localhost:9898 using it
mise start:web      # Just the frontend, using the staging API
mise lint           # golangci-lint, ESLint, and TypeScript checks
mise test:go        # Go tests (needs PostgreSQL running)
mise build          # Build the API and migrations into build/, and the frontend into build/web
mise db:migrate     # Run pending migrations
mise db:stop        # Stop PostgreSQL
```

Run `mise tasks` to see everything else.

## Data

This repo doesn't include a way to completely load up the DB with all of the
actual Pokemon data. That's only been loaded into the staging and production
databases. A local database has the schema but no Pokemon, games, or dex
types, so `mise start:web` (which uses the staging API) is the easiest way to
work on the frontend with real data.

## Deployments

> Note: you need the necessary permissions to be able to deploy.

The frontend and API currently deploy separately. Each deploy script builds a
multi-arch Docker image (`linux/amd64` and `linux/arm64`), pushes it to Docker
Hub, and deploys it to staging on [Fly.io](https://fly.io/). Once you've
checked staging, type `yes` at the prompt to deploy the same image to
production. Anything else skips production.

```sh
mise deploy:web     # Frontend
mise deploy:api     # API
```
