# SDK Parity: TypeScript vs Python

This document captures intentional differences between the TypeScript SDK (`@z3rno/sdk`) and the Python SDK (`z3rno`). These are design decisions, not bugs.

## Naming conventions

| Python SDK | TypeScript SDK | Reason |
|---|---|---|
| `snake_case` methods (`store_memory`) | `camelCase` methods (`store`) | Language convention |
| `snake_case` params (`agent_id`) | `camelCase` params (`agentId`) | Language convention |
| Server responses use `snake_case` in both SDKs (no translation on response objects) | Same | Wire format preserved |

## Validation

| Python | TypeScript |
|---|---|
| Pydantic models for request/response validation | Zod schemas with inferred TypeScript types |
| Validation errors are `pydantic.ValidationError` | Validation errors are `z3rno.ValidationError` (Zod under the hood) |

## HTTP layer

| Python | TypeScript |
|---|---|
| `httpx` (async and sync clients) | Native `fetch` API (async only) |
| `httpx.Client` / `httpx.AsyncClient` | Single `Z3rnoClient` class (always async) |
| Custom transport support via httpx | Custom `fetch` implementation via config (`fetch` option) |

## Async model

| Python | TypeScript |
|---|---|
| `Z3rnoClient` (sync) + `AsyncZ3rnoClient` (async) | `Z3rnoClient` is async by default |
| `async with AsyncZ3rnoClient() as client:` context manager | No context manager; call methods directly |

## Session management

| Python | TypeScript |
|---|---|
| `start_session()` / `end_session()` | `startSession()` / `endSession()` |
| Context manager: `async with client.session(agent_id):` | No context manager equivalent (use try/finally) |

## Error hierarchy

Both SDKs share the same error class hierarchy:

- `Z3rnoError` (base)
  - `AuthenticationError` (401)
  - `NotFoundError` (404)
  - `ValidationError` (400, 422)
  - `RateLimitError` (429, includes `retryAfter`)
  - `ServerError` (5xx)
  - `Z3rnoTimeoutError`
  - `Z3rnoConnectionError`

## Package distribution

| Python | TypeScript |
|---|---|
| PyPI: `z3rno` | npm: `@z3rno/sdk` |
| Single package | Dual CJS + ESM build |
| Python 3.10+ | Node.js 18+, Deno, Bun, browsers |
