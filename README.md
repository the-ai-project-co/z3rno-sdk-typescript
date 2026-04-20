# @z3rno/sdk (TypeScript)

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CI](https://github.com/the-ai-project-co/z3rno-sdk-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/the-ai-project-co/z3rno-sdk-typescript/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@z3rno/sdk)](https://www.npmjs.com/package/@z3rno/sdk)

TypeScript SDK for Z3rno -- native fetch client with Zod validation.

## Installation

```bash
npm install @z3rno/sdk
```

## Quickstart

```typescript
import { Z3rnoClient } from "@z3rno/sdk";

const client = new Z3rnoClient({ baseUrl: "https://api.z3rno.dev", apiKey: "z3rno_sk_..." });
const memory = await client.store({ agentId: "agent-1", content: "User prefers dark mode", memoryType: "semantic" });
const results = await client.recall({ agentId: "agent-1", query: "What does the user prefer?", topK: 5 });
await client.forget({ agentId: "agent-1", memoryId: memory.id });
```

## CJS + ESM Support

The SDK ships as a dual build via tsup. Both CommonJS and ES module entry points are provided:

```jsonc
// package.json exports
{
  "import": "./dist/index.js",   // ESM
  "require": "./dist/index.cjs"  // CJS
}
```

Works in Node.js 18+, Bun, Deno, and browsers.

## Methods

| Method | Description |
|--------|-------------|
| `store(request)` | Store a new memory with optional type, metadata, relationships, TTL, and importance |
| `recall(params)` | Recall memories by semantic similarity query |
| `forget(params)` | Soft-delete a memory by ID |
| `audit(params?)` | Query the audit trail with optional filters and pagination |

## Features

- **Zero runtime dependencies** -- only `zod` for request/response validation. No `axios`, no database drivers.
- **Native fetch** -- works in every modern JavaScript runtime without polyfills.
- **Runtime-validated responses** -- every API response is parsed through a Zod schema, giving both compile-time and runtime type safety.
- **Typed errors** -- `Z3rnoAuthenticationError`, `Z3rnoRateLimitError` (with `retryAfter`), `Z3rnoValidationError`.
- **Tree-shakeable** -- ESM build with clean exports for optimal bundling.

For a detailed step-by-step setup, see [QUICKSTART.md](QUICKSTART.md).

## API Documentation

Full API reference: [astron-bb4261fd.mintlify.app/sdk/typescript](https://astron-bb4261fd.mintlify.app/sdk/typescript)

## Development

```bash
npm install
npm run typecheck
npm run format:check
npm test
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## License

Apache 2.0 -- see [LICENSE](LICENSE).
