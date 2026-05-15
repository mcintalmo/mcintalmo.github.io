ARG PYTHON_VERSION=3.14
FROM python:${PYTHON_VERSION}-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy workspace files needed for dependency resolution
COPY pyproject.toml uv.lock ./
COPY common/ ./common/
COPY mcp/ ./mcp/

# Install only this service's deps (no dev deps)
RUN uv sync --package mcp --frozen --no-dev

CMD ["uv", "run", "--package", "mcp", "opentelemetry-instrument", "uvicorn", "mcp.main:app", "--host", "0.0.0.0"]