#!/bin/bash -e

# Deploys an image that staging is already running to production, then tags it
# as latest. scripts/deploy.sh runs this after its prompt, and
# `mise deploy:production <tag>` runs it on its own, for when staging was
# checked after the deploy script finished.

IMAGE="ghcr.io/pokedextracker/pokedextracker.com"
TAG="$1"

if [ -z "${TAG}" ]; then
  echo "Usage: mise deploy:production <tag> (the image tag staging is running, like af7ceb1)" >&2
  exit 1
fi

# Only promote what staging is running, so production never gets an image that
# wasn't checked there first.
STAGING_IMAGE=$(fly releases --app pokedextracker-staging --image --json | jq -r '[.[] | select(.Status == "complete")][0].ImageRef')
if [ "${STAGING_IMAGE}" != "${IMAGE}:${TAG}" ]; then
  echo
  echo -e "\033[1;31m==> Staging is running ${STAGING_IMAGE}, not ${IMAGE}:${TAG}."
  echo -e "==> Deploy ${TAG} to staging first (mise deploy, then skip production at the prompt).\033[0m"
  echo
  exit 1
fi

# Tagging latest pushes to the registry, which uses your gh login (see
# scripts/deploy.sh).
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
