# The whole site in one image: the Go API with the frontend embedded, plus
# the migrations binary Fly runs before each deploy.

# The pnpm version pinned in mise.toml, so local and image builds match. It's
# read in its own stage so that other edits to mise.toml don't redo the
# dependency install below.
FROM --platform=$BUILDPLATFORM node:26.12.0 AS pnpm-version
COPY mise.toml /
RUN version=$(sed -n 's/^pnpm = "\(.*\)"$/\1/p' /mise.toml) \
 && test -n "$version" \
 && echo "$version" > /pnpm-version

FROM --platform=$BUILDPLATFORM node:26.12.0 AS web
WORKDIR /src
COPY --from=pnpm-version /pnpm-version /tmp/pnpm-version
RUN npm install --global --silent "pnpm@$(cat /tmp/pnpm-version)"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --reporter=append-only
COPY babel.config.js tsconfig.json webpack.config.js ./
COPY config config
COPY public public
COPY app app
ARG VERSION=development
ENV NODE_ENV=production VERSION=$VERSION
RUN mkdir -p internal/webapp/dist && pnpm build \
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
