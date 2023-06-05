#!/bin/bash -e

CHART_VERSION=v0.1.0
NOW=$(date +'%s')
REPO="pokedextracker/pokedextracker.com"
TAG="$(git rev-parse --short HEAD)"
[[ -z $(git status -s) ]] || TAG="${TAG}-dirty-${NOW}"
KUBE_CONTEXTS="$(kubectl config get-contexts -o name)"

if ! echo "${KUBE_CONTEXTS}" | grep -q pokedextracker; then
  echo
  echo -e "\033[1;31m==> Couldn't find kube context with 'pokedextracker' in it. Make sure the cluster is configured correctly.\033[0m"
  echo
  exit 1
fi

KUBE_CONTEXT="$(echo "${KUBE_CONTEXTS}" | grep pokedextracker)"

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

echo
echo -e "\033[1;32m==> Updating Helm repos\033[0m"
echo

helm repo update

echo
echo -e "\033[1;32m==> Deploying ${TAG} to staging on ${KUBE_CONTEXT}...\033[0m"
echo

helm upgrade \
  --kube-context ${KUBE_CONTEXT} \
  --install frontend \
  --version ${CHART_VERSION} \
  --namespace staging \
  --values .kube/staging.yaml \
  --set-string processes.web.image.tag=${TAG} \
  --wait \
  pokedextracker/app

echo
echo -e "\033[1;33m==> Deployed to staging. If everything looks good and you want to deploy to"
echo -e "==> production, type 'yes' and hit enter. If you don't want to proceed with"
echo -e "==> production, type anything else or hit ^C.\033[0m"
echo

echo -n "Enter a value: "
read proceed

if [ "${proceed}" == "yes" ]; then
  echo
  echo -e "\033[1;32m==> Deploying ${TAG} to production ${KUBE_CONTEXT}...\033[0m"
  echo

  helm upgrade \
    --kube-context ${KUBE_CONTEXT} \
    --install frontend \
    --version ${CHART_VERSION} \
    --namespace production \
    --values .kube/production.yaml \
    --set-string processes.web.image.tag=${TAG} \
    --wait \
    pokedextracker/app
else
  echo
  echo -e "\033[1;33m==> Skipping deploying ${TAG} to production ${KUBE_CONTEXT}...\033[0m"
  echo
fi
