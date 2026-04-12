# CLAUDE.md

## Project

z3rno-sdk-typescript is the TypeScript SDK for Z3rno. It is a thin fetch-based client with Zod runtime validation. Zero HTTP dependencies beyond Zod. Dual CJS + ESM build.

## Quick Reference

```bash
npm install                      # Install dependencies
npm run build                    # Build with tsup (CJS + ESM)
npm run typecheck                # TypeScript type check
npm run format:check             # Prettier format check
npm run format                   # Prettier auto-format
npm test                         # Run tests (vitest, 25 tests)
```

## Architecture

- `src/index.ts` — Public exports
- `src/client.ts` — Z3rnoClient class (native fetch, all operations)
- `src/models.ts` — Zod schemas + inferred TypeScript types
- `src/errors.ts` — Z3rnoError hierarchy
- `tsup.config.ts` — Dual ESM/CJS build configuration

## SDK Methods

- `store(request)` -> MemoryResponse
- `recall(params)` -> RecallResponse
- `forget(params)` -> ForgetResponse
- `audit(params?)` -> AuditPageResponse

## Key Conventions

- Node.js 18+, TypeScript 5.7, ES2022 target
- Single runtime dependency: Zod (for response validation)
- Native fetch (no axios, no node-fetch, no undici)
- Dual build: ESM (dist/index.js) + CJS (dist/index.cjs) via tsup
- camelCase API (server uses snake_case, client translates)
- API key sent as Authorization: Bearer header
- Zod schemas parse all server responses at runtime
- Error hierarchy: AuthenticationError (401), RateLimitError (429 + retryAfter), ValidationError, NotFoundError (404), ServerError (5xx)
- Tests use vitest with vi.stubGlobal("fetch") for mocking
- Prettier for formatting (no ESLint)
- Package name on npm: `@z3rno/sdk`

## Publishing

- npm publish on `v*.*.*` tag push (GitHub Actions)
- Requires `NPM_TOKEN` repository secret
- Requires @z3rno org scope on npmjs.com
