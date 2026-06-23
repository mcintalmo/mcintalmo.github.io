# ==============================================================================
# General Configuration & Settings
# ==============================================================================
set shell := ["bash", "-c"]

# Display available recipes by default when running bare `just`
default:
    @just --list

# ==============================================================================
# 1. Global / Project-Wide Commands
# ==============================================================================

# Run all formatting, linting, and type checking across the entire repo
check-all: format lint type-check

# Run the complete verification suite including all unit and integration tests
validate-all: check-all test

# Clean up build artifacts, cache directories, and virtual environments
clean:
    rm -rf backend/.venv/ e2e/.venv/ frontend/node_modules/ resume/convert/node_modules/ node_modules/ frontend/dist/ frontend/.astro/
    find . -type d -name "__pycache__" -exec rm -rf {} +
    find . -type d -name ".pytest_cache" -exec rm -rf {} +
    find . -type d -name ".mypy_cache" -exec rm -rf {} +
    find . -type d -name ".biome_cache" -exec rm -rf {} +
    find . -type d -name ".ruff_cache" -exec rm -rf {} +

# ==============================================================================
# 2. Formatting & Linting (Fast Feedback Loops)
# ==============================================================================

# Safely format all codebases (Python via uv/ruff, JS/TS via Biome)
format:
    uv run --directory backend ruff format ..
    cd frontend && npx biome format --write . ../resume/convert/

# Run strict linting checks and apply safe autofixes across the repo
lint:
    uv run --directory backend ruff check .. --fix
    cd frontend && npx biome check --write . ../resume/convert/

# Run static type checking for the Python backend
type-check:
    MYPYPATH=agent/src:auth/src:mcp/src:common/src:tailor/src:resume/src uv run --directory backend mypy . --explicit-package-bases

# ==============================================================================
# 3. Testing Suites
# ==============================================================================

# Run all test suites across backend, frontend, and E2E frameworks
test: test-backend test-frontend test-e2e

# Run Python backend unit/integration tests (accepts standard pytest arguments)
test-backend *args:
    uv run --directory backend pytest {{args}}

# Run JavaScript/TypeScript frontend tests
test-frontend *args:
    npx pnpm --prefix frontend run test:run {{args}}

# Run end-to-end testing pipeline via Playwright
test-e2e *args:
    uv run --directory e2e pytest {{args}}

# Open the Playwright inspector/UI for interactive debugging of E2E tests
test-e2e-ui *args:
    uv run --directory e2e pytest --headed {{args}}

# ==============================================================================
# 4. Dependency Management & Bootstrapping
# ==============================================================================

# Bootstrap the entire local monorepo environment from scratch
bootstrap:
    @echo "==> Bootstrapping Python dependencies with uv..."
    uv sync --directory backend
    uv sync --directory e2e
    @echo "==> Bootstrapping JavaScript dependencies..."
    CI=true npx pnpm install --ignore-scripts
    @echo "==> Installing Playwright browser binaries..."
    uv run --directory e2e playwright install --with-deps
    @echo "==> Environment ready!"

# ==============================================================================
# 5. Local Server Execution & Docker Orchestration
# ==============================================================================

# Start all auxiliary docker containers (LiveKit, Whisper, Kokoro) in the background
start-containers:
    docker compose -f infra/docker-compose.yaml --profile core up -d

# Stop the auxiliary docker containers
stop-containers:
    docker compose -f infra/docker-compose.yaml --profile "*" down

# Run the backend authentication/token server (port 8000)
start-auth:
    PYTHONPATH=src uv run --directory backend/auth uvicorn auth.main:app --host 0.0.0.0 --port 8000 --reload

# Run the resume tailoring server (port 8001)
start-tailor:
    PYTHONPATH=src uv run --directory backend/tailor uvicorn tailor.server:app --host 0.0.0.0 --port 8001 --reload

# Run the LiveKit voice agent in development mode
start-agent:
    LIVEKIT_URL="ws://localhost:7880" LIVEKIT_API_KEY="${LIVEKIT_API_KEY:-devkey}" LIVEKIT_API_SECRET="${LIVEKIT_API_SECRET:-secret}" PYTHONPATH=src uv run --directory backend/agent python -m agent.main dev

console-text:
    LIVEKIT_URL="ws://localhost:7880" LIVEKIT_API_KEY="${LIVEKIT_API_KEY:-devkey}" LIVEKIT_API_SECRET="${LIVEKIT_API_SECRET:-secret}" PYTHONPATH=src uv run --directory backend/agent python -m agent.main console --text

console-voice:
    LIVEKIT_URL="ws://localhost:7880" LIVEKIT_API_KEY="${LIVEKIT_API_KEY:-devkey}" LIVEKIT_API_SECRET="${LIVEKIT_API_SECRET:-secret}" PYTHONPATH=src uv run --directory backend/agent python -m agent.main console

# Start all containers including core and telemetry profiles
start-all-containers:
    docker compose -f infra/docker-compose.yaml --profile core --profile telemetry up -d

# View logs for core services
logs-containers:
    docker compose -f infra/docker-compose.yaml --profile core logs -f

# Restart the voice agent container
restart-agent-container:
    docker compose -f infra/docker-compose.yaml restart agent

# Build the complete resume and PDF copy
build-resume:
    uv run --directory backend --package resume python -m resume.build

# Build the resume quickly without compiling the PDF
build-resume-fast:
    uv run --directory backend --package resume python -m resume.build --no-pdf

# Bootstrap OpenTelemetry requirements across python packages
bootstrap-otel:
    uv run --directory backend --package auth opentelemetry-bootstrap --action=requirements | uv add --directory backend --package auth -r -
    uv run --directory backend --package agent opentelemetry-bootstrap --action=requirements | uv add --directory backend --package agent -r -
    uv run --directory backend --package common opentelemetry-bootstrap --action=requirements | uv add --directory backend --package common -r -
    uv run --directory backend --package mcp opentelemetry-bootstrap --action=requirements | uv add --directory backend --package mcp -r -


# ==============================================================================
# 6. Frontend
# ==============================================================================

# Run the frontend development server (port 4321)
frontend:
    npx pnpm --prefix frontend run dev


# ==============================================================================
# 7. Deployment
# ==============================================================================

# Update whitelisted IP address in OCI VM security list
update-ip:
    bash infra/update-ip.sh

# Synchronize backend, infra, and resume files to the OCI VM
sync-vm:
    rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.venv' --exclude 'dist' --exclude '.astro' --exclude 'backend/.env' -e "ssh -i ~/.ssh/id_ed25519" ./ ubuntu@163.192.208.235:/home/ubuntu/mcintalmo.github.io/

# Run setup.sh on the OCI VM
setup-vm:
    ssh -i ~/.ssh/id_ed25519 ubuntu@163.192.208.235 "bash /home/ubuntu/mcintalmo.github.io/infra/setup.sh"
