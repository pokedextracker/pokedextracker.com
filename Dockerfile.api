FROM --platform=$BUILDPLATFORM golang:1.20.5 as build

WORKDIR /app

COPY go.mod go.mod
COPY go.sum go.sum
RUN go mod download

COPY cmd cmd
COPY pkg pkg

ARG VERSION
ARG TARGETARCH
ENV GOARCH $TARGETARCH

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/api -installsuffix cgo -ldflags "-w -s -X 'github.com/pokedextracker/api.pokedextracker.com/pkg/config.Version=${VERSION}'" ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/migrations -installsuffix cgo -ldflags "-w -s -X 'github.com/pokedextracker/api.pokedextracker.com/pkg/config.Version=${VERSION}'" ./cmd/migrations

FROM alpine:3.18

RUN apk --no-cache add ca-certificates tzdata

# Add AWS RDS CA bundle and split the bundle into individual certs (prefixed with cert)
# See http://blog.swwomm.com/2015/02/importing-new-rds-ca-certificate-into.html
ADD https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem /tmp/rds-ca/aws-rds-ca-bundle.pem
RUN cd /tmp/rds-ca && awk '/-BEGIN CERTIFICATE-/{close(x); x=++i;}{print > "cert"x;}' ./aws-rds-ca-bundle.pem \
    && for CERT in /tmp/rds-ca/cert*; do mv $CERT /usr/local/share/ca-certificates/aws-rds-ca-$(basename $CERT).crt; done \
    && rm -rf /tmp/rds-ca \
    && update-ca-certificates

ENV PATH="$PATH:/app/bin"

COPY --from=build /app/cmd /app/cmd
COPY --from=build /app/pkg /app/pkg
COPY --from=build /app/bin /app/bin

CMD ["api"]
