ARG PYTHON_VERSION=3.14
FROM python:${PYTHON_VERSION}-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy workspace files needed for dependency resolution
COPY pyproject.toml uv.lock ./
COPY common/ ./common/
COPY agent/ ./agent/

# Install only this service's deps (no dev deps)
RUN uv sync --package agent --frozen --no-dev

# Pre-download required AI/ML models (e.g. turn-detector ONNX files)
RUN uv run --package agent python -m livekit.agents download-files

CMD ["uv", "run", "--package", "agent", "python", "-m", "agent.main", "start"]
