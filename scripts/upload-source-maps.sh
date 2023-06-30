#!/bin/sh

# This is meant to be run within the built Docker image, not on your own machine.

if [ -z $ROLLBAR_TOKEN ]; then
  echo "ROLLBAR_TOKEN is not set"
  exit 1
fi

cd /usr/share/nginx/html

main_file=`ls main.*.js`
map_file=`ls main.*.js.map`

# Upload for staging.
curl https://api.rollbar.com/api/1/sourcemap \
  -F access_token=$ROLLBAR_TOKEN \
  -F version=$VERSION \
  -F minified_url=//staging.pokedextracker.com/$main_file \
  -F source_map=@$map_file

# Upload for production.
curl https://api.rollbar.com/api/1/sourcemap \
  -F access_token=$ROLLBAR_TOKEN \
  -F version=$VERSION \
  -F minified_url=//pokedextracker.com/$main_file \
  -F source_map=@$map_file
