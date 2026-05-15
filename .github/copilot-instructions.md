# GitHub Copilot Instructions

## Repo structure

This is a monorepo for a personal portfolio website with a Python backend and
an Astro frontend. The two sides are largely independent but share a data
contract for agent events (navigation, highlights) sent over a LiveKit data
channel.

```
portfolio/
├── frontend/        # Astro 5 + React, deployed to GitHub Pages
├── backend/         # Python uv workspace — agent, auth, mcp services
└── infra/           # Docker Compose, Nginx, observability config
```

For Python-specific conventions, see `.github/instructions/python.instructions.md`.
For TypeScript and Astro conventions, see `.github/instructions/typescript.instructions.md`.
This file covers repo-wide concerns only.

## Package managers

- Frontend: `pnpm`. Never use `npm` or `yarn`.
- Backend: `uv`. Never use `pip install` directly or create `requirements.txt` files.

## Design approach

- **Mobile-first.** All components are designed for small screens first and
  enhanced upward with media queries.
- Styling uses CSS custom properties defined in `src/styles/tokens.css`.
  Never hardcode colours, spacing, or font sizes.
- Icons use `lucide-react`. Do not add other icon libraries.

## Key config files

| File | Purpose |
|---|---|
| `frontend/astro.config.mjs` | Astro + React integration, static output |
| `frontend/tsconfig.json` | Strict TypeScript config |
| `frontend/biome.json` | Linting + formatting for `.ts` and `.tsx` |
| `frontend/.prettierrc` | Formatting for `.astro` files only |
| `frontend/package.json` | pnpm scripts: dev, build, lint, test |
| `backend/pyproject.toml` | uv workspace root, dev deps, Ruff + mypy config |
| `infra/docker-compose.yml` | All backend services |
| `infra/docker-compose.observability.yml` | OTel, Jaeger, Prometheus |

## Agent event contract

The Python agent and the frontend share a data channel event schema. The
canonical definitions are:

- TypeScript: `frontend/src/lib/agent-events.ts`
- Python: `backend/common/src/common/agent_events.py`

These must be kept in sync manually. When modifying either, always update the
other. Never add event types on one side without adding them to the other.

## Documentation

Use the Context7 MCP server to look up current library documentation before
using any third-party API. Prefer Context7 over training data for:
- Astro (`astro`)
- LiveKit Agents (`livekit-agents`)
- Pydantic (`pydantic`)
- OpenTelemetry (`opentelemetry-sdk`)

## What this project does NOT use

To avoid suggestions for things not in the stack:

- No Tailwind CSS — use CSS custom properties and CSS Modules
- No `react-hook-form` — there are no forms in this project
- No `axios` — use the typed `fetch` wrapper in `src/lib/api.ts`
- No `requirements.txt` — use `pyproject.toml` and `uv`
- No class components — React is functional only
- No default exports from components — named exports only (except Astro pages)
