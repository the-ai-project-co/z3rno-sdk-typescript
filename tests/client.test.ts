import { describe, expect, it, vi } from "vitest";
import { Z3rnoClient } from "../src/client.js";
import { AuthenticationError, RateLimitError } from "../src/errors.js";

describe("Z3rnoClient", () => {
  it("constructs without error", () => {
    const client = new Z3rnoClient({
      baseUrl: "http://localhost:8000",
      apiKey: "test-key",
    });
    expect(client).toBeDefined();
  });

  it("store() sends POST to /v1/memories", async () => {
    const mockResponse = {
      id: "mem-123",
      agent_id: "agent-1",
      content: "test content",
      memory_type: "episodic",
      importance_score: 0.5,
      recall_count: 0,
      created_at: "2026-04-12T00:00:00Z",
      metadata: {},
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
    });

    const result = await client.store({
      agentId: "agent-1",
      content: "test content",
    });

    expect(result.id).toBe("mem-123");
    expect(result.content).toBe("test content");
    vi.unstubAllGlobals();
  });

  it("throws AuthenticationError on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ error: "unauthorized" }),
        headers: new Headers(),
      })
    );

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "bad-key",
    });

    await expect(
      client.store({ agentId: "agent-1", content: "test" })
    ).rejects.toThrow(AuthenticationError);

    vi.unstubAllGlobals();
  });

  it("throws RateLimitError on 429 with retry_after", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: () => Promise.resolve({ error: "rate_limit_exceeded" }),
        headers: new Headers({ "Retry-After": "30" }),
      })
    );

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
    });

    try {
      await client.store({ agentId: "agent-1", content: "test" });
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitError);
      expect((e as RateLimitError).retryAfter).toBe(30);
    }

    vi.unstubAllGlobals();
  });
});
