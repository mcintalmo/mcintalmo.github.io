# Local Development & Environment Setup

This guide walks you through setting up and running the portfolio website and backend services on your local development machine.

---

## 1. Prerequisites

Ensure you have the following package managers and tools installed:
- **Python**: `>=3.14` (Managed via `uv` is highly recommended)
- **Node.js**: `>=20` (Managed via `pnpm`)
- **Docker & Docker Compose**: For local whisper/kokoro/litellm containers
- **Ollama**: (If running LLMs locally with hardware acceleration)
- **XeLaTeX**: (If building PDF resumes locally using RenderCV)

---

## 2. Global / Root Workspace

At the root directory, install the Node dependencies:
```bash
pnpm install
```

This installs the toolchain required for frontend build processes, linting, and resume generation helpers.

---

## 3. Frontend Development

The frontend is an Astro application. To run the development server:

```bash
pnpm dev
# Server runs at http://localhost:4321
```

To build and compile the static assets:
```bash
pnpm build
# Runs resume generation followed by Astro compilation. Outputs to dist/
```

---

## 4. Backend Development (Python uv Workspace)

The backend is built as a Python monorepo using `uv` workspaces.

### A. Setup Virtual Environment
Run from the root or `backend/` directory to create a virtual environment and sync all packages:
```bash
cd backend
uv sync
```
This automatically resolves dependencies for all workspace members: `common`, `auth`, `agent`, `tailor`, `resume`, and `mcp`.

### B. Environment Configuration
Create a `.env` file in the `backend/` directory. It should contain:
```ini
# Core API Keys
NVIDIA_API_KEY=your_nvidia_api_key_here
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here

# LLM / Voice Agent Endpoints
LITELLM_URL=http://localhost:4000
WHISPER_URL=http://localhost:10300
KOKORO_URL=http://localhost:10400
```

*Note: For production or staging deployment, copy `infra/.env.example` into `infra/.env` and fill in corresponding production values.*

---

## 5. Ollama & Hardware Acceleration Setup

To run local LLM tasks (like LangGraph tailoring or LiveKit chat logic) efficiently:

### Mac M-Series (Metal Acceleration)
Docker on Mac cannot access host GPUs. Therefore, run Ollama natively on the host:
1. Download and run [Ollama for Mac](https://ollama.com/download/mac).
2. Pull your chosen model:
   ```bash
   ollama pull phi3:mini
   ```
3. Docker containers will route LLM completion calls to your host at `http://host.docker.internal:11434` via the LiteLLM Proxy.

### Linux / OCI VM (NVIDIA/CUDA Acceleration)
Linux hosts can bind GPUs directly to Docker.
1. Make sure NVIDIA Container Toolkit is installed.
2. In `infra/docker-compose.yaml`, uncomment the Ollama container configuration and pass the `--gpus all` flag (or container equivalent).
3. Update `litellm_config.yaml` to point directly to `http://ollama:11434`.

---

## 6. Running Auxiliary Services (Docker Compose)

Start the auxiliary container services (Whisper for STT, Kokoro for TTS, Jaeger for OTel tracing):

```bash
cd infra
# Start base backend dependencies
make up-no-obs

# Or start with full observability tracing (Jaeger/Prometheus)
make up
```

---

## 7. Starting Backend Applications

### A. Resume Tailoring Server (FastAPI)
Run the FastAPI development server:
```bash
cd backend/tailor
uv run fastapi dev src/tailor/server.py
# Server runs at http://localhost:8000
# Swagger UI available at http://localhost:8000/docs
```

### B. LiveKit Voice Agent
Run the voice agent in development mode (auto-reloads and joins active rooms):
```bash
cd backend/agent
uv run python src/agent/main.py dev
```
To talk to the voice agent manually:
1. Navigate to the [LiveKit Agents Sandbox](https://agents-sandbox.livekit.io/).
2. Paste your local LiveKit Server URL and token (or connect to a cloud sandbox instance using your credentials).
3. Connect your mic and start chatting.
