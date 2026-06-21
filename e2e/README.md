# End-to-End Tests

This directory contains the end-to-end testing framework using Python, `pytest`, and `pytest-playwright`.

## Setup

1. Make sure you have `uv` installed.
2. Sync dependencies:
   ```bash
   uv sync
   ```
3. Install Playwright browsers:
   ```bash
   uv run playwright install
   ```

## Running Tests

Run the full suite in headless mode (default) and generate an HTML report:

```bash
uv run pytest
```

Run tests with headed browser (useful for debugging):

```bash
uv run pytest --headed
```

Run tests and force video/tracing recording:

```bash
uv run pytest --video=retain-on-failure --tracing=retain-on-failure
```
