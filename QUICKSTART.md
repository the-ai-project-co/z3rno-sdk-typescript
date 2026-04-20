# Quickstart: @z3rno/sdk (TypeScript)

A detailed getting-started guide for the Z3rno TypeScript SDK.

## Prerequisites

- Node.js 18+ (or Bun / Deno)
- A running Z3rno server (local or hosted)
- A Z3rno API key

If you do not have a Z3rno server running, see the [z3rno-server quickstart](https://github.com/the-ai-project-co/z3rno-server/blob/main/QUICKSTART.md) to set one up locally with Docker Compose.

## Step-by-step Installation

### 1. Install the SDK

```bash
npm install @z3rno/sdk
```

Or with your preferred package manager:

```bash
yarn add @z3rno/sdk
pnpm add @z3rno/sdk
bun add @z3rno/sdk
```

### 2. Create a client

```typescript
import { Z3rnoClient } from "@z3rno/sdk";

const client = new Z3rnoClient({
  baseUrl: "http://localhost:8000",
  apiKey: "z3rno_sk_test_localdev",
});
```

## First Working Example

Create a file `example.ts`:

```typescript
import { Z3rnoClient } from "@z3rno/sdk";

const client = new Z3rnoClient({
  baseUrl: "http://localhost:8000",
  apiKey: "z3rno_sk_test_localdev",
});

async function main() {
  // Store a memory
  const memory = await client.store({
    agentId: "agent-1",
    content: "User prefers dark mode",
    memoryType: "semantic",
  });
  console.log(`Stored: ${memory.id}`);

  // Recall memories
  const results = await client.recall({
    agentId: "agent-1",
    query: "What does the user prefer?",
    topK: 5,
  });
  results.forEach((r) => console.log(`  - ${r.content} (score: ${r.score})`));

  // Forget
  await client.forget({ agentId: "agent-1", memoryId: memory.id });
  console.log("Memory forgotten");
}

main();
```

Run it:

```bash
npx tsx example.ts
```

## Running Locally (Development)

To work on the SDK itself:

```bash
git clone https://github.com/the-ai-project-co/z3rno-sdk-typescript.git
cd z3rno-sdk-typescript
npm install
npm run build
npm test
```

### Development commands

```bash
npm run typecheck    # Type checking
npm run format:check # Formatting check
npm test             # Run tests
npm run build        # Build CJS + ESM outputs
```

## Common Issues / Troubleshooting

### 1. "fetch is not defined"

You are running on Node.js < 18, which does not include a global `fetch`. Upgrade to Node.js 18+ or use a polyfill.

### 2. "Connection refused" errors

The Z3rno server is not running at the configured `baseUrl`. Start it with:

```bash
# In the z3rno-server repo
docker compose -f docker-compose.dev.yml up
```

### 3. Zod validation errors on responses

If you see `ZodError` on API responses, the server version may be incompatible with the SDK version. Ensure both are up to date.

### 4. TypeScript compilation errors

Ensure you have `"moduleResolution": "bundler"` or `"node16"` in your `tsconfig.json`. The SDK exports both ESM and CJS via package.json `exports` field.

### 5. "401 Unauthorized"

Your API key is incorrect or missing. For local development, use `z3rno_sk_test_localdev`.
