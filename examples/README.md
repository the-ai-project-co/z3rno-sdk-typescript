# Z3rno SDK Examples

Usage examples for the `@z3rno/sdk` TypeScript package.

## Prerequisites

```bash
npm install @z3rno/sdk
export Z3RNO_BASE_URL=http://localhost:8000
export Z3RNO_API_KEY=z3rno_sk_...
```

## Examples

| File | Description |
|------|-------------|
| [basic-usage.ts](./basic-usage.ts) | Core operations: store, recall, forget, and audit |
| [vercel-ai.ts](./vercel-ai.ts) | Memory-augmented chat with the Vercel AI SDK |
| [langchain-js.ts](./langchain-js.ts) | LangChain.js `BaseMemory` provider backed by Z3rno |

## Running

All examples can be run with [tsx](https://github.com/privatenumber/tsx):

```bash
npx tsx examples/basic-usage.ts
```

## Notes

- The Vercel AI and LangChain examples are integration sketches. They require their respective packages to be installed separately.
- All examples expect a running Z3rno server at the configured `Z3RNO_BASE_URL`.
