COMPOSE_BASE = docker compose -f docker-compose.yml
COMPOSE_OBS  = $(COMPOSE_BASE) -f docker-compose.observability.yml
COMPOSE_LOCAL = $(COMPOSE_OBS) -f docker-compose.local.yml

up:
	$(COMPOSE_OBS) up -d

down:
	$(COMPOSE_OBS) down

up-no-obs:
	$(COMPOSE_BASE) up -d

dev:
	cd ../frontend && npm run build
	$(COMPOSE_LOCAL) up -d

dev-down:
	$(COMPOSE_LOCAL) down

logs:
	$(COMPOSE_OBS) logs -f

restart-agent:
	$(COMPOSE_BASE) restart agent

build-resume:
	cd ../backend && uv run --package resume python -m resume.build

build-resume-fast:
	cd ../backend && uv run --package resume python -m resume.build --no-pdf


bootstrap-otel:
	uv run --package auth   opentelemetry-bootstrap --action=requirements | uv add --package auth   -r -
	uv run --package agent  opentelemetry-bootstrap --action=requirements | uv add --package agent  -r -
	uv run --package common opentelemetry-bootstrap --action=requirements | uv add --package common -r -
	uv run --package mcp    opentelemetry-bootstrap --action=requirements | uv add --package mcp    -r -