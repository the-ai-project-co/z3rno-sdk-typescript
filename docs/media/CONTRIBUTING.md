# Contributing to z3rno-sdk-typescript

Thank you for your interest in contributing to Z3rno. This guide covers the development workflow for the TypeScript SDK.

## Getting Started

1. Fork and clone the repository.
2. Install Node.js 18+ and npm.
3. Install dependencies:

```bash
npm install
```

4. Run the checks:

```bash
npm run typecheck
npm run format:check
npm test
npm run build
```

## Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Write your code with tests.
3. Run type checking, formatting, tests, and build (see above).
4. Commit using conventional commit messages.
5. Open a pull request against `main`.

## Code Style

This project uses **prettier** for formatting and **TypeScript** strict mode for type safety.

```bash
# Format
npm run format

# Check formatting
npm run format:check

# Type check
npm run typecheck
```

## Testing

Tests use **vitest**. No running server is required for unit tests.

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## Building

The SDK ships as both ESM and CJS via **tsup**:

```bash
npm run build
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `test:` adding or updating tests
- `refactor:` code change that neither fixes a bug nor adds a feature
- `chore:` maintenance (deps, CI, tooling)

Examples:
- `feat: add listMemories method to client`
- `fix: Zod schema not validating optional metadata`

## Pull Request Process

1. Ensure all checks pass (`typecheck`, `format:check`, `test`, `build`).
2. Keep PRs focused -- one logical change per PR.
3. Update or add tests for any changed behavior.
4. Maintain parity with the Python SDK where applicable.
5. Fill out the PR template description.
6. A maintainer will review and merge.

## Questions?

Open a [GitHub Discussion](https://github.com/the-ai-project-co/z3rno-sdk-typescript/discussions) or reach out at engineering@z3rno.dev.
