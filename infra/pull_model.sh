#!/bin/sh
set -e

MODEL="${OLLAMA_MODEL_NAME:-qwen2.5:3b}"
OLLAMA_URL="${OLLAMA_HOST_URL:-http://localhost:11434}"

echo "==> Waiting for Ollama at ${OLLAMA_URL}..."
until curl -s "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; do
  sleep 2
done

echo "==> Ollama is ready! Checking and pulling model: ${MODEL}"
curl -s -X POST "${OLLAMA_URL}/api/pull" -d "{\"name\": \"${MODEL}\"}"
echo ""
echo "==> Model ${MODEL} pull request completed successfully!"
