FROM --platform=$BUILDPLATFORM node:18.16.0 as build

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY package.json package.json
COPY yarn.lock yarn.lock
RUN yarn --production --silent

COPY babel.config.js babel.config.js
COPY tsconfig.json tsconfig.json
COPY webpack.config.js webpack.config.js
COPY config config
COPY public public
COPY app app

ARG VERSION=development

RUN yarn build

FROM nginx:1.17.9-alpine

RUN apk add curl

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/dashboard.conf
COPY scripts/upload-source-maps.sh /usr/local/bin/upload-source-maps

RUN rm -rf /usr/share/nginx/html
COPY --from=build /app/public /usr/share/nginx/html
