# AGENTS.md

## Repository Overview

Personal portfolio monorepo featuring an Astro 5 + React frontend, a Python uv-workspace backend with real-time LiveKit conversational agents and resume tailoring, and local Docker infrastructure.

```
mcintalmo.github.io/
├── frontend/        # Astro 5 (Static Output) + React Islands, TypeScript, Biome
├── backend/         # Python uv workspace (Python 3.14+)
│   ├── agent/       # LiveKit Voice & Text AI agent (STT, LLM, TTS, tool calling)
│   ├── auth/        # FastAPI service generating LiveKit room JWTs (port 8000)
│   ├── tailor/      # LangGraph + DeepEval resume tailoring pipeline (port 8001)
│   ├── common/      # Shared Pydantic models, LiveKit event schemas, and config
│   ├── resume/      # RenderCV + Typst PDF/Markdown/JSON resume generation
│   └── mcp/         # FastMCP tools & server
├── infra/           # Docker Compose: LiveKit, LiteLLM, Ollama, Whisper, Kokoro, OTel
├── resume/          # Source resume YAML (`resume/resume.yaml`) & config
├── e2e/             # Playwright E2E test suite
└── justfile         # Repository task runner
```

---

## Package Managers & Tooling

- **Python**: Exclusively managed by `uv`. Never use `pip install` or create `requirements.txt`.
  - Format & Lint: `ruff` (`ruff format ..`, `ruff check .. --fix`)
  - Type-checking: `ty` (`ty check`)
  - Test framework: `pytest`
- **Frontend**: Exclusively managed by `pnpm`. Never use `npm` or `yarn`.
  - Lint & Format: `biome` for TS/TSX; `prettier` for `.astro`
  - Test framework: `vitest`
- **Tasks**: Managed via `just` (`justfile`).

---

## Essential Commands

| Command | Description |
|---|---|
| `just check-all` | Run all formatting, strict linting, and type checking (`ruff`, `biome`, `ty`) |
| `just format` | Safely format all Python and TS/TSX/.astro files |
| `just lint` | Run strict linting and safe autofixes across repo |
| `just type-check` | Run static type checking for Python backend via `ty` |
| `just test` | Run all test suites (backend, frontend, E2E) |
| `just test-backend` | Run Python pytest suite (use `-m "not eval"` for fast local execution without external LLM judge) |
| `just test-frontend` | Run Vitest unit tests |
| `just upgrade` | Upgrade all frontend and backend dependencies (7-day time-locked) |
| `just build` | Compile complete production bundle (resume artifacts + static Astro site) |
| `just preview` | Build and preview the production static site locally (`http://localhost:4321`) |
| `just verify-build` | Run complete build verification (linters/types, production build, unit tests, Playwright E2E) |
| `just start-containers` | Start auxiliary Docker containers (`livekit`, `whisper`, `kokoro`, `litellm`, `ollama`) |
| `just start-auth` | Start backend auth server (`http://localhost:8000`) |
| `just start-agent` | Start LiveKit Python agent in development mode |
| `just frontend` | Start Astro development server (`http://localhost:4321`) |
| `just build-resume` | Compile `resume/resume.yaml` into PDF, Markdown, and JSON artifacts |

---

## Architecture & Data Contracts

### 1. LiveKit Conversational Agent
- **Server**: LiveKit server runs on `ws://localhost:7880` (or `wss://livekit.alexandermcintosh.com` in prod).
- **Agent Lifecycle** (`backend/agent/src/agent/`):
  - Connects to room as `portfolio-agent`.
  - Configurable STT (default: progressive streaming `WhisperSTT` with Silero VAD + self-hosted Whisper `Systran/faster-whisper-tiny.en` for live interim transcription and automatic turn detection).
  - LLM calls route through LiteLLM router on `http://localhost:4000/v1` (with fallbacks: GitHub Models, OpenRouter, NVIDIA, local Ollama).
  - TTS: Cartesia or local self-hosted Kokoro (`http://localhost:8880/v1`).
- **Tool Calling**:
  - Tools in `backend/agent/src/agent/tools.py` use the `@track_tool_call` decorator.
  - Broadcasts `ToolCallStartedEvent` and `ToolCallCompletedEvent` over LiveKit room data packets to synchronize frontend visual states.

### 2. Frontend React Islands & Chat UI
- `frontend/src/components/ChatAgent.tsx`:
  - Fetches room JWTs from local auth (`http://localhost:8000`) with automatic production fallback (`https://api.alexandermcintosh.com`) if local auth is unreachable.
- `frontend/src/components/CustomChatWidget.tsx`:
  - Renders unified chronological timeline combining user/agent messages and real-time tool call indicators (running spinners, completion checkmarks, and human-readable action labels).

### 3. Agent Event Contract Synchronization
When modifying agent events, keep both files strictly in sync:
- TypeScript: `frontend/src/lib/events.ts`
- Python: `backend/common/src/common/events.py`

---

## Coding Guidelines & Pitfalls for AI Agents

1. **No Emojis**: Avoid using emojis in commit messages, docstrings, or code generation unless explicitly requested.
2. **Secrets & API Keys**:
   - Never hardcode or commit actual API keys into code files (e.g. `LlmSettings.api_key`, `TailorLlmSettings.api_key`).
   - Use `pydantic-settings` with default placeholders (`"local-key"` or `""`) and load keys via `.env` / environment variables.
3. **Type Checking with `ty`**:
   - Avoid blanket `# type: ignore` directives unless strictly required. `ty` enforces `unused-type-ignore-comment` and will fail builds if ignore comments are redundant.
4. **Fast Feedback**:
   - Always verify changes with `just check-all` before completing tasks.
