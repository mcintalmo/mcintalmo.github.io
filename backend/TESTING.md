# Backend Testing & Evaluation Guide

This repository utilizes a dual-testing strategy for both standard core logic testing and LLM-based behavioral evaluations.

## Prerequisites

1. Ensure you have installed the development dependencies:
   ```bash
   uv sync
   ```

2. Configure your `.env` files with necessary keys:
   - `NVIDIA_API_KEY`: Required for LLM evaluations and tailoring pipeline.
   - `LIVEKIT_API_KEY` & `LIVEKIT_API_SECRET`: Required for voice agent testing.

## 1. Unit Testing (Fast, No LLMs)

Standard unit tests verify structural integrity and core logic without hitting the LLM endpoints. We use `pytest` with `pytest-asyncio` for these.

```bash
# Run all fast unit tests
uv run pytest -m "not eval"

# Run tests for specific components
uv run pytest tailor/tests
uv run pytest agent/tests
```

## 2. LLM Evaluation (Slow, API Cost)

We use evaluation frameworks (LLM-as-a-judge) to ensure AI agents and pipelines respond correctly and logically. Since these are costly and slow, they are marked with `@pytest.mark.eval`.

### A. LiveKit Voice Agent Evals

We use the native `livekit.agents.testing` framework. This simulates a user speaking to the agent and evaluates the agent's textual response against an intent.

```bash
uv run pytest agent/tests/test_evals.py -m eval -v
```

*Note: You can set `LIVEKIT_EVALS_VERBOSE=1` to see the full transcripts of the simulation.*

### B. LangGraph Pipeline Evals (DeepEval)

We use `deepeval` to evaluate the Resume Tailoring pipeline. DeepEval runs through your provided Golden dataset and grades the pipeline's output.

```bash
# Run DeepEval against the tailor pipeline
uv run deepeval test run tailor/tests/evals/test_tailor.py
```

*Note: Goldens are stored in `tailor/tests/evals/.dataset.json`. You can modify this dataset or use `deepeval generate` to create synthetic test cases.*

## 3. Manual / CLI Testing

### A. Tailoring Pipeline

You can invoke the tailoring pipeline API locally by starting the Fastapi server.

```bash
cd tailor
uv run fastapi dev src/tailor/server.py
```

Then, visit `http://localhost:8000/docs` to interact with the Swagger UI. You can submit a job description and base resume directly.

### B. Voice Agent

To test the LiveKit voice agent manually:

1. **Start the agent locally:**
   ```bash
   cd agent
   uv run python src/agent/main.py dev
   ```
2. **Connect via LiveKit Sandbox:**
   Go to [LiveKit Sandbox](https://agents-sandbox.livekit.io/), plug in your project URL, and connect your microphone to speak with the agent.

### C. Docker Integration

When running end-to-end integration tests that require Whisper or Kokoro, make sure your docker containers are spun up:
```bash
docker-compose up -d whisper kokoro
```
Then run the integration suite:
```bash
uv run pytest agent/tests/test_integration.py
```
