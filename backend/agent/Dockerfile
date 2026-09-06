ARG PYTHON_VERSION=3.14
FROM python:${PYTHON_VERSION}-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
ENV TMPDIR=/app/.tmp

# Copy workspace files needed for dependency resolution
COPY pyproject.toml uv.lock ./
COPY common/ ./common/
COPY agent/ ./agent/

# Install only this service's deps (no dev deps)
RUN mkdir -p /app/.tmp && uv sync --package agent --frozen --no-dev --no-cache && rm -rf /app/.tmp

CMD ["uv", "run", "--package", "agent", "python", "-m", "agent.main", "start"]
