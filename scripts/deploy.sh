#!/bin/bash -e

# Load any secrets.
test -f .env && . .env

NOW=$(date +'%s')
REPO="pokedextracker/pokedextracker.com"
TAG="$(git rev-parse --short HEAD)"
[[ -z $(git status -s) ]] || TAG="${TAG}-dirty-${NOW}"

if ! docker buildx ls | grep -q multiarch; then
  echo
  echo -e "\033[1;32m==> Creating multiarch builder instance...\033[0m"
  echo

  docker buildx create --name multiarch --node multiarch
fi

echo
echo -e "\033[1;32m==> Building and pushing ${TAG}...\033[0m"
echo

# When building for other architectures, we can't keep the image locally, so we
# need to push it in the same command that we build it. We build and push for
# x86_64 and ARM64v8, just so we have both just in case. This will fail if
# you're not logged in.
DOCKER_BUILDKIT=1 docker buildx build \
  --push \
  --builder multiarch \
  --platform linux/arm64,linux/amd64 \
  --build-arg VERSION=${TAG} \
  --tag ${REPO}:${TAG} \
  .

if ! [ -z $ROLLBAR_TOKEN ]; then
  echo
  echo -e "\033[1;32m==> Uploading source maps to Rollbar\033[0m"
  echo

  docker run \
    --rm \
    -e ROLLBAR_TOKEN=${ROLLBAR_TOKEN} \
    -e VERSION=${TAG} \
    ${REPO}:${TAG} \
    upload-source-maps
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
  --image ${REPO}:${TAG} \
  --vm-size shared-cpu-1x

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
    --image ${REPO}:${TAG} \
    --vm-size shared-cpu-1x
else
  echo
  echo -e "\033[1;33m==> Skipping deploying ${TAG} to production...\033[0m"
  echo
fi
