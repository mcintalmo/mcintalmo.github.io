# Testing & Evaluation Strategy

This project implements a multi-layered testing strategy combining standard unit tests, LLM-as-a-judge evaluations, and Playwright end-to-end (E2E) UI testing.

---

## 1. Backend Testing

The backend tests are split between fast unit tests (no LLM calls) and slow/costly evaluations (which hit local or cloud LLMs). All backend tests use `pytest`.

Ensure you run tests within the `backend/` directory using `uv run`.

### A. Fast Unit Tests
These tests check standard python logic, structure, schemas, and validators. They mock external network/LLM requests.

```bash
# Run all non-eval tests
uv run pytest -m "not eval"
```

### B. LLM-as-a-Judge Evaluations (`@pytest.mark.eval`)
Evaluations verify agent behavior, alignment, and generation quality. Because they call LLM endpoints, they take longer and incur API/hardware costs.

```bash
# Run LLM evals
uv run pytest -m "eval"
```

#### LiveKit Voice Agent Evals
Tests in `backend/agent/tests/test_evals.py` simulate a real audio interaction using `livekit.agents.testing`.
- **How it works**: It feeds a series of simulated inputs (representing audio transcription transcripts) into the agent and asserts that the textual response contains correct intents or replies.
- **Verbosity**: Set `LIVEKIT_EVALS_VERBOSE=1` to print full conversational transcripts to stdout during the test run.

#### LangGraph Tailoring Evals (DeepEval)
The tailoring pipeline is evaluated using the DeepEval framework inside `backend/tailor/tests/evals/test_tailor.py`.
- **How it works**: DeepEval compares the output of the tailoring pipeline against a predefined Golden dataset.
- **Metrics used**: Correctness, completeness, and adherence to resume formatting.
- **Dataset location**: `backend/tailor/tests/evals/.dataset.json` contains the test cases.
- **Running Evals**:
  ```bash
  uv run deepeval test run tailor/tests/evals/test_tailor.py
  ```

---

## 2. End-to-End UI Testing (Playwright)

E2E tests reside in the `e2e/` folder. They use Python, `pytest`, and `pytest-playwright` to test the actual frontend interface.

### A. Prerequisites
Before running E2E tests, ensure:
1. The frontend development server is running:
   ```bash
   pnpm dev
   ```
2. Playwright browsers are installed:
   ```bash
   cd e2e
   uv sync
   uv run playwright install
   ```

### B. Running Tests
Run the E2E suite using the following commands inside the `e2e/` folder:

```bash
# Run headless (default) and output HTML report
uv run pytest

# Run in headed mode (opens browser window)
uv run pytest --headed

# Capture video and traces only on failure
uv run pytest --video=retain-on-failure --tracing=retain-on-failure
```

Upon completion, an HTML test report is generated at `e2e/report.html`.

---

## 3. Autonomous AI-Agent Testing Support

The E2E framework is designed with specific hooks to enable autonomous AI agents (such as Google Antigravity) to browse the site, inspect DOM states, and verify functionality.

- **DOM Extraction**: The `BasePage` object model contains a `get_page_content()` helper that extracts the complete loaded DOM.
- **Accessibility / Structure Verification**: Test suites (like `test_spa_dom_extraction`) utilize this to verify document structure (e.g. `<html>` and `<body>` tags, heading hierarchies) without requiring visual rendering capability.
- **Failure Screenshots**: If a test fails, `conftest.py` automatically captures a full-page screenshot under `e2e/test-results/screenshots/` and links it into the generated HTML report.
