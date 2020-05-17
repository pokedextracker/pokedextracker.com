FROM node:12.16.1 as build

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY package.json package.json
COPY yarn.lock yarn.lock
RUN yarn --production --silent

COPY .babelrc .babelrc
COPY webpack.config.js webpack.config.js
COPY config config
COPY public public
COPY app app

ARG VERSION=development

RUN yarn build

FROM nginx:1.17.9-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/dashboard.conf

RUN rm -rf /usr/share/nginx/html
COPY --from=build /app/public /usr/share/nginx/html
