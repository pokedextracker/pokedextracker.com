BIN_DIR ?= ./bin
SCRIPTS_DIR ?= ./scripts

COVERAGE_PROFILE ?= coverage.out
MEMORY_PROFILE ?= memprofile.out

ENVIRONMENT ?= development

DATABASE_USER ?= pokedex_tracker_admin
TEST_DATABASE_NAME ?= pokedex_tracker_test
DEVELOPMENT_DATABASE_NAME ?= pokedex_tracker
DATABASE_PORT ?= 9876

DATABASE_DEBUG ?= true
LOG_LEVEL ?= info

TEST_FILES ?= ./pkg/...
TEST_FLAGS ?=

default: start

.PHONY: bench
bench:
	ENVIRONMENT=test go test -run=XXX -bench=. -memprofile $(MEMORY_PROFILE) $(TEST_FILES) $(TEST_FLAGS)

.PHONY: build
build: install
	@echo "---> Building"
	CGO_ENABLED=0 go build -o $(BIN_DIR)/api -installsuffix cgo ./cmd/api
	CGO_ENABLED=0 go build -o $(BIN_DIR)/migrations -installsuffix cgo ./cmd/migrations

.PHONY: clean
clean:
	@echo "---> Cleaning"
	go clean
	rm -rf $(BIN_DIR) $(COVERAGE_PROFILE) ./tmp

.PHONY: db\:migrate
db\:migrate:
	@echo "---> Migrating"
	DATABASE_PORT=${DATABASE_PORT} go run cmd/migrations/*.go migrate

.PHONY: db\:migrate\:create
db\:migrate\:create:
	@echo "---> Creating new migration"
	DATABASE_PORT=${DATABASE_PORT} go run cmd/migrations/*.go create $(name)

.PHONY: db\:migrate\:test
db\:migrate\:test:
	DATABASE_PORT=${DATABASE_PORT} ENVIRONMENT=test $(MAKE) db:migrate

.PHONY: db\:rollback
db\:rollback:
	@echo "---> Rolling back"
	DATABASE_PORT=${DATABASE_PORT} go run cmd/migrations/*.go rollback

.PHONY: deploy
deploy:
	@echo "---> Deploying"
	$(SCRIPTS_DIR)/deploy.sh

.PHONY: enforce
enforce:
	@echo "---> Enforcing coverage"
	$(SCRIPTS_DIR)/coverage.sh $(COVERAGE_PROFILE)

.PHONY: html
html:
	@echo "---> Generating HTML coverage report"
	go tool cover -html $(COVERAGE_PROFILE)

.PHONY: install
install:
	@echo "---> Installing dependencies"
	go mod download

.PHONY: lint
lint: $(BIN_DIR)/golangci-lint
	@echo "---> Linting"
	$(BIN_DIR)/golangci-lint run

.PHONY: psql
psql:
	@echo "---> Starting psql"
	psql -h localhost -p $(DATABASE_PORT) -d $(DEVELOPMENT_DATABASE_NAME) -U $(DATABASE_USER)

.PHONY: psql\:test
psql\:test:
	@echo "---> Starting psql for test database"
	psql -h localhost -p $(DATABASE_PORT) -d $(TEST_DATABASE_NAME) -U $(DATABASE_USER)

.PHONY: setup
setup: $(BIN_DIR)/golangci-lint
	@echo "--> Setting up"
	go get $(GO_TOOLS) && GOBIN=$$(pwd)/$(BIN_DIR) go install $(GO_TOOLS)

$(BIN_DIR)/golangci-lint:
	@echo "--> Installing linter"
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(BIN_DIR) v1.53.3

$(BIN_DIR)/gin:
	@echo "--> Installing live reloader"
	GOBIN=$$(pwd)/$(BIN_DIR) go install github.com/codegangsta/gin@latest

.PHONY: start
start:
	$(MAKE) -j start:deps start:api

.PHONY: start\:test
start\:test:
	ENVIRONMENT=test $(MAKE) start

.PHONY: start\:deps
start\:deps:
	@echo "---> Starting dependencies in Docker"
	touch ~/.psqlrc ~/.inputrc
	COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose up --build --remove-orphans

.PHONY: start\:api
start\:api: $(BIN_DIR)/gin
	@echo "---> Starting API"
	test -f .env && . .env || echo "----> No .env found"
	while ! nc -z localhost $(DATABASE_PORT); do sleep 0.1; done
	DATABASE_DEBUG=${DATABASE_DEBUG} DATABASE_PORT=${DATABASE_PORT} LOG_LEVEL=${LOG_LEVEL} TZ=UTC $(BIN_DIR)/gin --excludeDir tmp --excludeDir scripts --port 8647 --appPort 8648 --path . --build ./cmd/api --immediate --bin $(BIN_DIR)/gin-api run | sed $$'s/^/\x1B[34mapi         | \x1B[0m/'

.PHONY: test
test: db\:migrate\:test
	@echo "---> Testing"
	# You'll need to start:deps in a separate session so that the database is running since some of the tests depend on
	# it. If this is a fresh clone/database, you'll need to make sure you create the database with make test:setup.
	DATABASE_PORT=${DATABASE_PORT} ENVIRONMENT=test TZ=UTC go test -race $(TEST_FILES) -coverprofile $(COVERAGE_PROFILE) $(TEST_FLAGS)

.PHONY: test\:setup
test\:setup:
	@echo "---> Setting up test environment"
	createdb -h localhost -p $(DATABASE_PORT) -U $(DATABASE_USER) $(TEST_DATABASE_NAME)
