#!/bin/bash -e

# Deploys an image that staging is already running to production, then tags it
# as latest. scripts/deploy.sh runs this after its prompt, and
# `mise deploy:production <tag>` runs it on its own, for when staging was
# checked after the deploy script finished.
#
# Variables are always braced (${IMAGE}:latest, not $IMAGE:latest): these
# lines get copied into zsh, which reads $IMAGE:latest as $IMAGE with its :l
# (lowercase) modifier.

# The fly configs are relative to the repo root.
cd "$(dirname "${0}")/.."

# Load any secrets (SENTRY_AUTH_TOKEN for recording the deploy) the same way
# scripts/deploy.sh does: the main checkout's .env, then this worktree's own.
MAIN_ROOT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
test -f "${MAIN_ROOT}/.env" && . "${MAIN_ROOT}/.env"
test -f .env && . .env
export SENTRY_AUTH_TOKEN

IMAGE="ghcr.io/pokedextracker/pokedextracker.com"
TAG="${1}"

if [ -z "${TAG}" ]; then
  echo "Usage: mise deploy:production <tag> (the image tag staging is running, like af7ceb1)" >&2
  exit 1
fi

# Only promote what staging is running, so production never gets an image that
# wasn't checked there first. This asks the machines rather than the release
# list, since a machine can be running something other than the latest release
# (after a failed deploy, or a machine update that makes no release).
if ! machines=$(fly machines list --app pokedextracker-staging --json); then
  echo
  echo -e "\033[1;31m==> Couldn't list staging's machines (see the error above), so nothing was deployed.\033[0m"
  echo
  exit 1
fi
STAGING_IMAGES=$(jq -r '[.[] | select(.config.metadata.fly_process_group == "app") | .config.image] | unique | join(", ")' <<< "${machines}")
if [ "${STAGING_IMAGES}" != "${IMAGE}:${TAG}" ]; then
  echo
  echo -e "\033[1;31m==> Staging's machines are running ${STAGING_IMAGES:-nothing}, not ${IMAGE}:${TAG}."
  echo -e "==> Deploy ${TAG} to staging first (mise deploy, then skip production at the prompt).\033[0m"
  echo
  exit 1
fi

# Tagging latest pushes to the registry, which uses your gh login (see
# scripts/deploy.sh). Logging in comes before the production deploy on purpose:
# if it's going to fail, it's better to find out before anything changes, so a
# rerun does both steps.
gh auth token | docker login ghcr.io --username "$(gh api user --jq .login)" --password-stdin

echo
echo -e "\033[1;32m==> Deploying ${TAG} to production...\033[0m"
echo

fly deploy \
  --config .fly/production.toml \
  --image "${IMAGE}:${TAG}"

echo
echo -e "\033[1;32m==> Tagging ${TAG} as latest...\033[0m"
echo

# latest tracks production, so it only moves once production is running this
# image. This copies the multi-arch index in the registry without rebuilding.
# Production is already deployed by now, so a failure here is only a warning.
if ! docker buildx imagetools create --tag "${IMAGE}:latest" "${IMAGE}:${TAG}"; then
  echo -e "\n\033[1;33m==> Couldn't tag ${TAG} as latest; production is still deployed\033[0m"
fi

# scripts/deploy.sh created the release when it deployed staging. This comes
# last so a slow or unreachable Sentry can't hold up tagging latest, and like
# that step it's only a warning.
if [ -n "${SENTRY_AUTH_TOKEN}" ]; then
  pnpm exec sentry-cli deploys new --org pokedextracker --release "${TAG}" --env production ||
    echo -e "\n\033[1;33m==> Couldn't record the production deploy in Sentry\033[0m"
else
  echo -e "\n\033[1;33m==> Skipping recording the production deploy in Sentry (no SENTRY_AUTH_TOKEN)\033[0m"
fi
