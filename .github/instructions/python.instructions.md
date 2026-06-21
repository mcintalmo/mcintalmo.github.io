# Python Coding Instructions

## Project context

This is a Python monorepo managed with **uv workspaces**. The workspace root is
`backend/`, and services live under `backend/agent/`, `backend/auth/`,
`backend/mcp/`, and `backend/common/`. Each service has its own
`pyproject.toml`; shared utilities live in `common/` and are referenced via
`{ workspace = true }` sources.

All services target **Python 3.14+**. Use modern language features freely.

---

## Package & dependency management

- Use **uv** for all dependency management. Never use `pip install` directly,
  and never create or edit `requirements.txt` files.
- Add dependencies to the relevant service's `pyproject.toml`, not the workspace
  root. The root `pyproject.toml` holds only dev dependencies and tool config.
- Reference shared code via the `common` workspace package — do not copy
  utilities between services.
- Pin versions in `pyproject.toml` using `>=` lower bounds (e.g.
  `"fastapi>=0.111"`), not exact pins. The lockfile (`uv.lock`) handles
  reproducibility.

---

## Code style

Formatting and linting are enforced by **Ruff**. Configuration lives in
`backend/pyproject.toml`. Do not add inline `# noqa` comments to suppress
rules without a comment explaining why.

### Formatting rules (Ruff defaults + project config)

- Line length: **88 characters**
- Use **double quotes** for strings
- Always use a **trailing comma** in multi-line collections and function
  signatures

### Naming

- Modules and packages: `snake_case`
- Classes: `PascalCase`
- Functions, methods, variables: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
- Private members: single leading underscore (`_private`)
- Never use single-letter variable names except in short lambda expressions or
  comprehensions where the meaning is obvious (e.g. `[x * 2 for x in items]`)

---

## Type annotations

- **All** functions and methods must have fully annotated signatures, including
  return types. No bare `-> None` omissions.
- Use built-in generics (`list[str]`, `dict[str, int]`, `tuple[int, ...]`)
  rather than `typing.List`, `typing.Dict`, etc.
- Use `X | Y` union syntax rather than `Optional[X]` or `Union[X, Y]`.
- Use `typing.TypeAlias` for type aliases and annotate them at module level.
- Prefer `typing.Protocol` over ABC for structural typing when the implementor
  shouldn't need to inherit.
- Run **mypy** in strict mode. Do not use `type: ignore` without an inline
  comment explaining the reason.

```python
# Good
def get_user(user_id: int) -> User | None: ...

# Bad
def get_user(user_id):  # missing annotations
def get_user(user_id: int) -> Optional[User]: ...  # use | None instead
```

---

## Modern Python idioms

Prefer modern syntax and stdlib features:

- `match` / `case` for branching on structured data instead of long
  `if/elif` chains
- **Pydantic** models instead of plain dicts for structured data
- `pathlib.Path` instead of `os.path`
- `tomllib` (stdlib, 3.11+) for reading TOML config files
- f-strings for all string formatting — no `%` formatting or `.format()`

---

## Async

All services are async. Follow these rules throughout:

- Use `async def` for all I/O-bound functions. Never call blocking I/O inside a
  coroutine — use `asyncio.to_thread()` if you must wrap a synchronous call.
- Use `asyncio.TaskGroup` (3.11+) for concurrent tasks instead of
  `asyncio.gather()`.
- Prefer `async with` and `async for` over manual `await` chaining where
  available.
- Never use `asyncio.get_event_loop()` — use `asyncio.get_running_loop()` if
  you need the loop, or `asyncio.run()` at the entry point.

```python
# Good
async with asyncio.TaskGroup() as tg:
    task_a = tg.create_task(fetch_a())
    task_b = tg.create_task(fetch_b())

# Avoid
results = await asyncio.gather(fetch_a(), fetch_b())
```

---

## Error handling

- Define custom exception classes in `common/src/common/exceptions.py` and
  import them in services. Never raise bare `Exception`.
- Always catch specific exceptions — never bare `except:` or `except Exception:`
  without re-raising or logging with full context.
- Use `raise X from Y` when wrapping exceptions to preserve the chain.
- In FastAPI route handlers, let exceptions propagate to registered exception
  handlers rather than catching and returning manually constructed error
  responses inline.

```python
# Good
try:
    token = await mint_token(user_id)
except LiveKitError as exc:
    raise TokenMintError("Failed to mint token") from exc

# Bad
try:
    token = await mint_token(user_id)
except Exception:
    return {"error": "something went wrong"}
```

---

## Pydantic & settings

- Use **Pydantic v2** models for all request/response schemas and internal
  structured data.
- Application config must use `pydantic_settings.BaseSettings` with a
  `.env`-backed source. Config classes live in `common/src/common/config.py` or
  a service-local `config.py`.
- Never read `os.environ` directly — always go through a settings model.
- Mark secrets as `pydantic.SecretStr` so they are redacted in logs and reprs.

```python
from pydantic_settings import BaseSettings
from pydantic import SecretStr

class Settings(BaseSettings):
    livekit_api_key: str
    livekit_api_secret: SecretStr
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
```

---

## Observability (OpenTelemetry)

All services export traces, metrics, and logs to the OTel Collector.

- Use **`opentelemetry-bootstrap`** to manage instrumentation packages. After
  updating a service's dependencies, run:
```bash
  uv run --package <service> opentelemetry-bootstrap --action=install
```
  This detects installed packages and installs the appropriate instrumentation
  packages automatically. Re-run it whenever dependencies change.
- Launch services via **`opentelemetry-instrument`** in the Dockerfile `CMD`
  rather than in application code:
```dockerfile
  CMD ["uv", "run", "--package", "auth", "opentelemetry-instrument", "uvicorn", "auth.main:app", "--host", "0.0.0.0"]
```
- Only reach for manual spans via `tracer.start_as_current_span()` for
  application-level operations that auto-instrumentation won't capture — e.g.
  business logic, external SDK calls (LiveKit, MCP), or agent steps.
- Attach semantic attributes using `opentelemetry.semconv` constants rather than
  raw strings where a convention exists.
- Never log secrets or PII inside span attributes or log records.

---

## Logging

- Use **structlog** (configured in `common`) for all logging. Never use the
  stdlib `logging` module directly in application code.
- Log at the call site with bound context rather than constructing strings:
  `log.info("token.minted", user_id=user_id, room=room_name)`
- Use log levels correctly: `debug` for internal state, `info` for normal
  operations, `warning` for recoverable unexpected states, `error` for failures
  that need attention.

---

## Testing

- All tests use **pytest** with `asyncio_mode = "auto"` (configured in the
  workspace root `pyproject.toml`).
- Test files live in `<service>/tests/` and mirror the source layout.
- Use `pytest-httpx` for mocking HTTP calls and `pytest.fixture` with the
  narrowest possible scope.
- Avoid mocking internal implementation details — test behaviour through public
  interfaces.
- All async test functions should be plain `async def` (no
  `@pytest.mark.asyncio` decorator needed with `asyncio_mode = "auto"`).

---

## FastAPI specifics (auth service)

- Define routers in separate modules and register them in `main.py` via
  `app.include_router()`.
- Use `Annotated` + `Depends()` for dependency injection — never call
  dependency functions directly inside route handlers.
- Always set explicit `status_code` on route decorators rather than relying on
  the default 200.
- Lifespan events (startup/shutdown) must use the `@asynccontextmanager`
  lifespan pattern, not deprecated `@app.on_event` handlers.

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    await startup()
    yield
    await shutdown()

app = FastAPI(lifespan=lifespan)
```

---

## Docker & environment

- Each service's `Dockerfile` builds from the `backend/` directory as context
  so the uv lockfile and `common/` package are available.
- Do not bake secrets into images. All secrets come from environment variables
  at runtime, sourced from the `.env` file on the host via Docker Compose.
- The entry point should always be:
  `uv run --package <service> <entrypoint command>`
  