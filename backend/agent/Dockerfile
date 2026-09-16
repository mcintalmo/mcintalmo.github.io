ARG PYTHON_VERSION=3.14
FROM python:${PYTHON_VERSION}-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Create unprivileged application user
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -m -d /home/appuser -s /bin/bash appuser

WORKDIR /app
ENV HOME=/home/appuser
ENV TMPDIR=/home/appuser/.tmp

# Copy workspace files needed for dependency resolution
COPY pyproject.toml uv.lock ./
COPY common/ ./common/
COPY agent/ ./agent/

# Install only this service's deps (no dev deps) and set ownership
RUN mkdir -p /home/appuser/.tmp /home/appuser/.cache && \
    uv sync --package agent --frozen --no-dev --no-cache && \
    rm -rf /home/appuser/.tmp && \
    mkdir -p /home/appuser/.tmp && \
    chown -R appuser:appgroup /app /home/appuser

USER appuser

CMD ["uv", "run", "--package", "agent", "python", "-m", "agent.main", "start"]
