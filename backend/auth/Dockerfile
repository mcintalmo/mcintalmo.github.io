ARG PYTHON_VERSION=3.14
FROM python:${PYTHON_VERSION}-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy workspace files needed for dependency resolution
COPY pyproject.toml uv.lock ./
COPY common/ ./common/
COPY auth/ ./auth/

# Install only this service's deps (no dev deps)
RUN uv sync --package auth --frozen --no-dev

CMD ["uv", "run", "--package", "auth", "opentelemetry-instrument", "uvicorn", "auth.main:app", "--host", "0.0.0.0"]