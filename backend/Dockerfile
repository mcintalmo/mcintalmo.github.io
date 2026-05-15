# syntax=docker/dockerfile:1.4
FROM python:3.14-slim-bookworm

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Install system dependencies if required by LiveKit or other packages
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Enable bytecode compilation and suppress the virtual environment warning
ENV UV_COMPILE_BYTECODE=1 \
    UV_SYSTEM_PYTHON=1

# Copy the dependencies definition files
COPY pyproject.toml uv.lock ./

# Sync dependencies without installing the project itself
RUN uv sync --frozen --no-install-project --no-dev

# Copy the rest of the application code
COPY app/ ./app/

# By default, we will rely on docker-compose to override the command 
# based on whether it is the voice_agent or the mcp_server.
# A basic default command
CMD ["uv", "run", "python", "app/agent.py", "dev"]
