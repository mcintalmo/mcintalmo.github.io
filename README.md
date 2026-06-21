# Alexander McIntosh – Portfolio Monorepo

Welcome! This repository hosts a modern, highly interactive portfolio website built with **Astro, React, and TypeScript**, alongside a set of AI backend services powered by **LangGraph** (resume tailoring) and **LiveKit** (multimodal voice agent).

---

## 📖 Table of Documentation

To help human developers and AI coding agents onboard quickly, we have structured deep-dive context inside the `/docs` directory:

| Document | Description |
| :--- | :--- |
| 🏗️ [Technical Architecture](file:///Users/mcint/projects/mcintalmo.github.io/docs/architecture.md) | Component responsibilities, monorepo directory layout, data flows, and infrastructure diagram. |
| 💻 [Local Development Guide](file:///Users/mcint/projects/mcintalmo.github.io/docs/development.md) | Prerequisites, env setup, local Ollama Metal/GPU configuration, and running the dev servers. |
| 🧪 [Testing & Evaluation Strategy](file:///Users/mcint/projects/mcintalmo.github.io/docs/testing.md) | How to run unit tests, LLM-as-a-judge evals (DeepEval & LiveKit simulations), and Playwright E2E suites. |
| 🤖 [AI Agent & Styling Guidelines](file:///Users/mcint/projects/mcintalmo.github.io/docs/agent_instructions.md) | Mandatory styling rules, type safety requirements (Ruff, Mypy), and pre-commit checks. |

---

## ⚡ Quick Start

For full installation and service configurations, please refer to the [Local Development Guide](file:///Users/mcint/projects/mcintalmo.github.io/docs/development.md). Below is the tl;dr version:

### 1. Install Dependencies

```bash
# Install frontend package manager dependencies
pnpm install

# Setup backend Python virtual environment and dependencies
cd backend
uv sync
```

### 2. Configure Environment

Create a `.env` file in the `backend/` directory:

```ini
NVIDIA_API_KEY=your_nvidia_key
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
```

### 3. Spin Up Docker Containers

Start whisper, kokoro, and local routing proxies:

```bash
cd infra
make up-no-obs
```

### 4. Run Development Servers

- **Frontend**: Run `pnpm dev` from the root directory (runs Astro on `http://localhost:4321`).
- **Backend**: Run `uv run fastapi dev src/tailor/server.py` in `backend/tailor` (`http://localhost:8000`).
- **Voice Agent**: Run `uv run python src/agent/main.py dev` in `backend/agent`.

---

## 🛠️ Testing & Quality Control

We maintain a strict testing regime spanning from fast unit tests up to LLM evaluations and end-to-end user path testing:

```bash
# Run unit tests (excluding LLM calls)
cd backend
uv run pytest -m "not eval"

# Run LLM-as-a-judge Evals
uv run pytest -m "eval"

# Run Playwright E2E UI Tests
cd ../e2e
uv run pytest
```

See [Testing & Evaluation Strategy](file:///Users/mcint/projects/mcintalmo.github.io/docs/testing.md) for detailed instructions on debugging test failures and view-tracing.
