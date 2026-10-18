# The whole site in one image: the Go API with the frontend embedded, plus
# the migrations binary Fly runs before each deploy.

FROM --platform=$BUILDPLATFORM node:18.16.0 AS web
WORKDIR /src
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --silent
COPY babel.config.js tsconfig.json webpack.config.js ./
COPY config config
COPY public public
COPY app app
ARG VERSION=development
ENV NODE_ENV=production VERSION=$VERSION
RUN mkdir -p internal/webapp/dist && yarn build \
 && test -f internal/webapp/dist/index.html

# Just the frontend build, which the deploy script exports to upload source
# maps for exactly the files in the image.
FROM scratch AS web-dist
COPY --from=web /src/internal/webapp/dist /

# Built under /app and run from /app/bin, so Rollbar trims stack frames to
# repository paths (/app/pkg/... becomes pkg/...).
FROM --platform=$BUILDPLATFORM golang:1.20.5 AS api
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY cmd cmd
COPY internal internal
COPY pkg pkg
COPY --from=web /src/internal/webapp/dist internal/webapp/dist
ARG VERSION=development
ARG TARGETOS
ARG TARGETARCH
ENV CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH
RUN go build -ldflags "-w -s -X 'github.com/pokedextracker/pokedextracker.com/pkg/config.Version=${VERSION}'" -o /app/bin/api ./cmd/api \
 && go build -ldflags "-w -s -X 'github.com/pokedextracker/pokedextracker.com/pkg/config.Version=${VERSION}'" -o /app/bin/migrations ./cmd/migrations

FROM alpine:3.24.2
LABEL org.opencontainers.image.source="https://github.com/pokedextracker/pokedextracker.com"
RUN apk add --no-cache ca-certificates tzdata \
 && adduser -D -H -u 10001 app
COPY --from=api /app/bin /app/bin
ENV PATH="/app/bin:$PATH"
USER app
EXPOSE 8647
CMD ["api"]
