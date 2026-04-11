# @z3rno/sdk

> The official TypeScript SDK for Z3rno. Zero runtime dependencies (beyond Zod). Native `fetch`. Works in Node.js 18+, Bun, Deno, and browsers.

**License:** Apache 2.0
**Status:** Early development — not yet on npm
**Part of:** [Z3rno](https://github.com/the-ai-project-co) — the database for AI agent memory

## Installation

```bash
npm install @z3rno/sdk   # (when published)
# or: pnpm add @z3rno/sdk, yarn add @z3rno/sdk, bun add @z3rno/sdk
```

## Quickstart

```typescript
import { Z3rnoClient } from '@z3rno/sdk';

const client = new Z3rnoClient({
  baseUrl: 'https://api.z3rno.dev',  // or your self-hosted z3rno-server
  apiKey: 'z3rno_sk_...',
});

// Store a memory
const memory = await client.store({
  agentId: 'agent-1',
  content: 'User prefers dark mode and uses TypeScript.',
  memoryType: 'semantic',
});

// Recall memories
const results = await client.recall({
  agentId: 'agent-1',
  query: 'What does the user prefer?',
  topK: 5,
});
```

## Design

- **Zero dependencies.** Only `zod` for runtime request/response validation. No `axios`, no `node-fetch`, no `pg` database driver.
- **Native fetch everywhere.** Works in every modern JavaScript runtime.
- **ESM + CJS dual build** via `tsup`. Tree-shakeable exports.
- **Runtime-validated responses.** Every API response is parsed through a Zod schema before being returned — you get both compile-time and runtime type safety.
- **Typed errors.** Same error hierarchy as the Python SDK, case-adjusted: `Z3rnoAuthenticationError`, `Z3rnoRateLimitError` (with `retryAfter`), `Z3rnoValidationError`, etc.

## Parity with Python SDK

Every method in `z3rno-sdk-python` has a case-adjusted equivalent here. Any intentional divergence is documented in `PARITY.md`.
