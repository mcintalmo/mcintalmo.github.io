ARG PYTHON_VERSION=3.14
FROM python:${PYTHON_VERSION}-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Create unprivileged application user
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -m -d /home/appuser -s /bin/bash appuser

WORKDIR /app

# Copy workspace files needed for dependency resolution
COPY pyproject.toml uv.lock ./
COPY common/ ./common/
COPY auth/ ./auth/

# Install only this service's deps (no dev deps) and set ownership
RUN uv sync --package auth --frozen --no-dev && \
    chown -R appuser:appgroup /app /home/appuser

USER appuser

CMD ["uv", "run", "--package", "auth", "uvicorn", "auth.main:app", "--host", "0.0.0.0"]
