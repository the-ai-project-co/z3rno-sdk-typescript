/**
 * Integration tests against a real Z3rno server.
 *
 * These tests are skipped unless the `Z3RNO_TEST_URL` environment variable
 * is set to the base URL of a running Z3rno instance (e.g.,
 * `Z3RNO_TEST_URL=http://localhost:8000 npm test`).
 *
 * Optionally set `Z3RNO_TEST_API_KEY` for authenticated endpoints.
 */

import { describe, expect, it } from "vitest";
import { Z3rnoClient } from "../src/client.js";
import { NotFoundError, ValidationError } from "../src/errors.js";

const TEST_URL = process.env.Z3RNO_TEST_URL;
const TEST_KEY = process.env.Z3RNO_TEST_API_KEY ?? "";
const AGENT_ID = "00000000-0000-4000-a000-000000000001";

describe.skipIf(!TEST_URL)("Integration (requires running server)", () => {
  const client = new Z3rnoClient({
    baseUrl: TEST_URL ?? "",
    apiKey: TEST_KEY,
    timeout: 15000,
    maxRetries: 0,
  });

  it("store -> recall -> forget lifecycle", async () => {
    // Store
    const memory = await client.store({
      agentId: AGENT_ID,
      content: "Integration test: the sky is blue",
      memoryType: "semantic",
    });
    expect(memory.id).toBeDefined();
    expect(memory.content).toBe("Integration test: the sky is blue");

    // Recall
    const results = await client.recall({
      agentId: AGENT_ID,
      query: "sky color",
      topK: 5,
    });
    expect(results.results.length).toBeGreaterThanOrEqual(1);
    const match = results.results.find((r) => r.memory_id === memory.id);
    expect(match).toBeDefined();

    // Forget
    const deleted = await client.forget({
      agentId: AGENT_ID,
      memoryId: memory.id,
      hardDelete: true,
    });
    expect(deleted.deleted_count).toBe(1);
  });

  it("returns 404 for non-existent memory", async () => {
    await expect(
      client.getMemory("00000000-0000-4000-a000-000000000000"),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns 422 for invalid request body", async () => {
    await expect(
      client.store({
        agentId: "not-a-uuid",
        content: "bad agent id",
      }),
    ).rejects.toThrow(ValidationError);
  });
});
