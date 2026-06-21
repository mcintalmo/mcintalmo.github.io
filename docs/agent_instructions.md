# AI Agent & Developer Styling Guidelines

This document outlines the strict style guides, type safety requirements, and formatting rules that must be followed by both human developers and autonomous AI coding agents (such as Google Antigravity).

---

## 1. Python Style Guide & Formatting

The Python backend enforces modern formatting standards configured in the root and package-level `pyproject.toml` files.

### A. Line Length & Hard Wrapping
- **Rule**: There is a strict **88-character line-length limit** for all Python files.
- **String Management**: Do not let long strings exceed the 88-character limit. Break them up using implicit string concatenation within parentheses, or use standard multiline strings where appropriate.

*Correct Example:*
```python
message = (
    "This is a long error message that has been broken up into "
    "multiple lines in order to stay within the 88-character "
    "line limit enforced by the linter."
)
```

### B. Linting and Formatting Tools
We use `ruff` for both linting and code formatting. Before proposing or committing any code changes:
1. **Format Code**:
   ```bash
   uv run ruff format
   ```
2. **Lint Code**:
   ```bash
   uv run ruff check
   ```

---

## 2. Type Safety & Static Analysis

The backend codebase is configured with **strict mypy type-checking** to prevent runtime errors and ensure code clarity.

- **Mypy Strict Mode**: The backend `pyproject.toml` sets `strict = true` for `mypy`. All new modules, functions, and variables must include explicit type annotations.
- **How to verify**: Run mypy from the `backend/` directory before committing:
  ```bash
  uv run mypy .
  ```
- **External libraries**: If a library lacks type stubs, use type-ignore comments selectively or configure them in `pyproject.toml`.

---

## 3. Code Preservation

- **Comments and Docstrings**: Always preserve existing docstrings, documentation, and inline comments that are unrelated to your current modification.
- **Self-Documenting Code**: Write descriptive variable names and keep function/class structures clean and focused.

---

## 4. Pre-Commit Verification Checklist

Before completing any task, ensure you have run the following verification suite:

1. **Ruff linting & formatting**:
   ```bash
   uv run ruff check && uv run ruff format --check
   ```
2. **Mypy type checking**:
   ```bash
   uv run mypy .
   ```
3. **Unit tests (Fast)**:
   ```bash
   uv run pytest -m "not eval"
   ```
4. **Playwright E2E UI tests**:
   ```bash
   # Ensure frontend is running (pnpm dev)
   cd ../e2e
   uv run pytest
   ```
