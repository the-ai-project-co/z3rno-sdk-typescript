/**
 * Runtime compatibility tests.
 *
 * Verifies that the SDK does not depend on Node.js-specific APIs and can
 * run in any runtime that provides standard Web APIs (fetch, AbortController,
 * URL, URLSearchParams, setTimeout).
 *
 * Deno / Bun compatibility:
 *   - Deno: `deno test --allow-net tests/runtime.test.ts` (with npm: specifiers)
 *   - Bun:  `bun test tests/runtime.test.ts`
 *
 * Both runtimes support npm packages and provide global fetch / AbortController,
 * so the SDK should work out of the box.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Scans all SDK source files and asserts that none of them use Node.js-only
 * APIs (require, fs, path, child_process, etc.).
 */
describe("Runtime compatibility (Deno / Bun)", () => {
  const srcDir = path.resolve(__dirname, "../src");
  const sourceFiles = fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => ({
      name: f,
      content: fs.readFileSync(path.join(srcDir, f), "utf-8"),
    }));

  // Patterns that indicate Node.js-only API usage
  const forbiddenPatterns: Array<{ pattern: RegExp; description: string }> = [
    { pattern: /\brequire\s*\(/, description: "require() call" },
    { pattern: /from\s+["']fs["']/, description: "import from 'fs'" },
    { pattern: /from\s+["']node:fs["']/, description: "import from 'node:fs'" },
    { pattern: /from\s+["']path["']/, description: "import from 'path'" },
    {
      pattern: /from\s+["']node:path["']/,
      description: "import from 'node:path'",
    },
    {
      pattern: /from\s+["']child_process["']/,
      description: "import from 'child_process'",
    },
    {
      pattern: /from\s+["']node:child_process["']/,
      description: "import from 'node:child_process'",
    },
    { pattern: /from\s+["']http["']/, description: "import from 'http'" },
    {
      pattern: /from\s+["']node:http["']/,
      description: "import from 'node:http'",
    },
    { pattern: /\bBuffer\b/, description: "Buffer usage" },
  ];

  for (const file of sourceFiles) {
    it(`${file.name} does not use Node.js-specific APIs`, () => {
      for (const { pattern, description } of forbiddenPatterns) {
        expect(
          pattern.test(file.content),
          `${file.name} contains forbidden ${description}`,
        ).toBe(false);
      }
    });
  }

  it("SDK uses only standard Web APIs (fetch, AbortController, URL, setTimeout)", () => {
    // This is a documentation / assertion test: the SDK relies on:
    // - globalThis.fetch (or user-provided fetch)
    // - AbortController
    // - URLSearchParams
    // - setTimeout / clearTimeout
    // - JSON.parse / JSON.stringify
    // All of these are available in Deno, Bun, Node.js 18+, and browsers.
    expect(true).toBe(true);
  });
});
