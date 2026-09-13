#!/usr/bin/env bash
set -eo pipefail

# Stdin (hook payload) is ignored

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Autofix & format Python backend
if command -v uv >/dev/null 2>&1; then
  (cd "$REPO_ROOT" && uv run ruff check --fix backend/ >/dev/null 2>&1 || true)
  (cd "$REPO_ROOT" && uv run ruff format backend/ >/dev/null 2>&1 || true)
fi

# Autofix & format frontend
if command -v pnpm >/dev/null 2>&1; then
  (cd "$REPO_ROOT/frontend" && pnpm biome check --write >/dev/null 2>&1 || true)
fi

# Output empty JSON object required by PostToolUse hook contract
echo "{}"
