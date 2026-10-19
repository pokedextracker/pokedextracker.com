#!/bin/bash -e

# Deploys the single-binary app (API and frontend in one image) to Fly.io:
# staging first, then production after a prompt.

# Load any secrets (ROLLBAR_TOKEN for source maps): the main checkout's .env,
# so deploys from other worktrees get it too, then this worktree's own.
MAIN_ROOT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
test -f "$MAIN_ROOT/.env" && . "$MAIN_ROOT/.env"
test -f .env && . .env

NOW=$(date +'%s')
IMAGE="ghcr.io/pokedextracker/pokedextracker.com"
TAG="$(git rev-parse --short HEAD)"
[[ -z $(git status -s) ]] || TAG="${TAG}-dirty-${NOW}"

if ! docker buildx ls | grep -q multiarch; then
  echo
  echo -e "\033[1;32m==> Creating multiarch builder instance...\033[0m"
  echo

  docker buildx create --name multiarch --node multiarch
fi

echo
echo -e "\033[1;32m==> Logging in to the GitHub Container Registry...\033[0m"
echo

# Uses your gh login, which needs the write:packages scope once:
#   gh auth refresh -s write:packages
gh auth token | docker login ghcr.io --username "$(gh api user --jq .login)" --password-stdin

echo
echo -e "\033[1;32m==> Building and pushing ${IMAGE}:${TAG}...\033[0m"
echo

# When building for other architectures, we can't keep the image locally, so we
# need to push it in the same command that we build it. We build and push for
# x86_64 and ARM64v8, just so we have both just in case. The annotation links
# the package to this repository on GitHub (the Dockerfile's label only does
# that for single-architecture images).
DOCKER_BUILDKIT=1 docker buildx build \
  --push \
  --builder multiarch \
  --file Dockerfile \
  --platform linux/arm64,linux/amd64 \
  --build-arg VERSION=${TAG} \
  --annotation "index:org.opencontainers.image.source=https://github.com/pokedextracker/pokedextracker.com" \
  --tag ${IMAGE}:${TAG} \
  .

# Fly pulls the image without credentials, so the package has to be public.
# New packages start out private; this only needs fixing once.
if ! visibility=$(gh api /orgs/pokedextracker/packages/container/pokedextracker.com --jq .visibility); then
  echo
  echo -e "\033[1;31m==> Couldn't check whether ${IMAGE} is public (see the error above). Your gh"
  echo -e "==> login needs the write:packages scope: gh auth refresh -s write:packages\033[0m"
  echo
  exit 1
fi
if [ "${visibility}" != "public" ]; then
  echo
  echo -e "\033[1;31m==> ${IMAGE} is ${visibility}, so Fly can't pull it. Make it public at"
  echo -e "==> https://github.com/orgs/pokedextracker/packages/container/pokedextracker.com/settings"
  echo -e "==> (Danger Zone, Change visibility), then run this again.\033[0m"
  echo
  exit 1
fi

if [ -n "$ROLLBAR_TOKEN" ]; then
  echo
  echo -e "\033[1;32m==> Uploading source maps to Rollbar\033[0m"
  echo

  # Export the frontend stage of the same build (it's cached, so these are
  # the exact files in the image) and upload its source maps.
  WEB_DIR=$(mktemp -d)
  trap 'rm -rf "$WEB_DIR"' EXIT
  DOCKER_BUILDKIT=1 docker buildx build \
    --builder multiarch \
    --file Dockerfile \
    --target web-dist \
    --output type=local,dest="$WEB_DIR" \
    .

  # Vite puts the built scripts, with their source maps, in assets/.
  shopt -s nullglob
  script_paths=("$WEB_DIR"/assets/*.js)
  if [ ${#script_paths[@]} -eq 0 ]; then
    echo "No assets/*.js in the frontend build; can't upload source maps." >&2
    exit 1
  fi
  for script_path in "${script_paths[@]}"; do
    script_file="assets/$(basename "$script_path")"
    for host in staging.pokedextracker.com pokedextracker.com; do
      # The site works without source maps, so a failed upload is a warning
      # rather than a reason to stop the deploy.
      if ! curl -q -sS --fail-with-body --retry 3 --retry-all-errors https://api.rollbar.com/api/1/sourcemap \
        -F access_token=$ROLLBAR_TOKEN \
        -F version=$TAG \
        -F minified_url=//$host/$script_file \
        -F source_map=@$script_path.map; then
        echo -e "\n\033[1;33m==> Couldn't upload the source map for //$host/$script_file; continuing\033[0m"
      fi
      echo
    done
  done
else
  echo
  echo -e "\033[1;33m==> Skipping uploading source maps to Rollbar\033[0m"
  echo
fi

echo
echo -e "\033[1;32m==> Deploying ${TAG} to staging...\033[0m"
echo

fly deploy \
  --config .fly/staging.toml \
  --image ${IMAGE}:${TAG}

echo
echo -e "\033[1;33m==> Deployed to staging. If everything looks good and you want to deploy to"
echo -e "==> production, type 'yes' and hit enter. If you don't want to proceed with"
echo -e "==> production, type anything else or hit ^C.\033[0m"
echo

echo -n "Enter a value: "
read proceed

if [ "${proceed}" == "yes" ]; then
  echo
  echo -e "\033[1;32m==> Deploying ${TAG} to production...\033[0m"
  echo

  fly deploy \
    --config .fly/production.toml \
    --image ${IMAGE}:${TAG}
else
  echo
  echo -e "\033[1;33m==> Skipping deploying ${TAG} to production...\033[0m"
  echo
fi
