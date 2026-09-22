COMPOSE = docker compose --env-file /dev/null -f compose.yaml
PSQL = $(COMPOSE) exec -T db psql -X -U fieldops_owner -v ON_ERROR_STOP=1

.PHONY: up migrate seed test status stop api-build api-up api-test

up:
	$(COMPOSE) up -d --wait --wait-timeout 90
	$(PSQL) -d postgres -f /workspace/create-local-databases.sql

migrate:
	$(PSQL) -d fieldops -f /workspace/migrate.sql

seed:
	$(PSQL) -d fieldops -f /workspace/seed-local.sql

test:
	$(PSQL) -d fieldops_test -f /workspace/migrate.sql
	$(PSQL) -d fieldops_test -f /workspace/migrate.sql
	$(PSQL) -d fieldops_test -f /workspace/tests/run.sql

status:
	$(PSQL) -d fieldops -c 'SELECT postgis_full_version();'
	$(PSQL) -d fieldops -c 'TABLE fieldops_meta.schema_migrations;'

stop:
	$(COMPOSE) --profile api stop

api-build:
	$(COMPOSE) build api

api-up:
	$(COMPOSE) --profile api up -d api

api-test:
	$(PSQL) -d postgres -f /workspace/create-local-databases.sql
	$(PSQL) -d fieldops_api_test -f /workspace/migrate.sql
	$(PSQL) -d fieldops_api_test -f /workspace/seed-local.sql
	$(COMPOSE) run --rm --no-deps api /app/.venv/bin/pytest
