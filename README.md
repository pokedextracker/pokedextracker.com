# pokedextracker.com

[![CircleCI](https://circleci.com/gh/pokedextracker/pokedextracker.com.svg?style=shield)](https://circleci.com/gh/pokedextracker/pokedextracker.com)

A website to track your completion of a Living Pokedex.

## Setup

Node.js and Yarn versions are pinned in `mise.toml`. With
[`mise`](https://mise.jdx.dev/) installed, run:

```sh
mise install
yarn
```

## Development

```sh
yarn start       # Dev server at http://localhost:9898
yarn lint:all    # ESLint and TypeScript checks (run in CI)
yarn build       # Production build into build/
```

## Deployments

> Note: you need the necessary permissions to be able to deploy.

`yarn deploy` builds and pushes a multi-arch Docker image, deploys it to
staging on [Fly.io](https://fly.io/), and then prompts before deploying to
production.
