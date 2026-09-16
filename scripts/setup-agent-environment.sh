#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "Configuring Unified Local Coding Agent Environment"
echo "========================================================"

AGENTS_DIR="${HOME}/.agents"
GEMINI_DIR="${HOME}/.gemini/config"
CLAUDE_DIR="${HOME}/.claude"

# 1. Create canonical machine-level ~/.agents directory structure
mkdir -p "${AGENTS_DIR}/skills"
mkdir -p "${AGENTS_DIR}/rules"
mkdir -p "${GEMINI_DIR}"
mkdir -p "${CLAUDE_DIR}"

# 2. Seed canonical ~/.agents/mcp.json if not present
if [ ! -f "${AGENTS_DIR}/mcp.json" ]; then
  cat << 'EOF' > "${AGENTS_DIR}/mcp.json"
{
  "mcpServers": {
    "context7": {
      "command": "context7",
      "args": ["serve"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
EOF
  echo "Created canonical MCP registry: ${AGENTS_DIR}/mcp.json"
fi

# 3. Symlink Antigravity global configuration to ~/.agents
ln -sfn "${AGENTS_DIR}/skills" "${GEMINI_DIR}/skills"
ln -sfn "${AGENTS_DIR}/mcp.json" "${GEMINI_DIR}/mcp_config.json"
echo "Linked Antigravity config (~/.gemini/config) -> ~/.agents"

# 4. Symlink Claude Code global skills to ~/.agents
ln -sfn "${AGENTS_DIR}/skills" "${CLAUDE_DIR}/skills"
echo "Linked Claude Code skills (~/.claude/skills) -> ~/.agents/skills"

echo "========================================================"
echo "Local Environment Configuration Completed Successfully"
echo "========================================================"
echo "Recommended Shell Exports (for LiteLLM / Ollama routing):"
echo '  export OPENAI_BASE_URL="http://localhost:4000/v1"'
echo '  export OPENAI_API_KEY="local-key"'  # pragma: allowlist secret
echo "========================================================"
