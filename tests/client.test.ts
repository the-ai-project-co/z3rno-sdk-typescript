import { afterEach, describe, expect, it, vi } from "vitest";
import { Z3rnoClient } from "../src/client.js";
import {
  AuthenticationError,
  RateLimitError,
  ServerError,
  Z3rnoError,
  Z3rnoTimeoutError,
} from "../src/errors.js";

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
      }),
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
      }),
    );

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "bad-key",
    });

    await expect(
      client.store({ agentId: "agent-1", content: "test" }),
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
      }),
    );

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
      maxRetries: 0,
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

  // --- recall() ---

  it("recall() sends POST to /v1/memories/recall", async () => {
    const mockResponse = {
      results: [
        {
          memory_id: "mem-1",
          content: "User prefers dark mode",
          summary: null,
          memory_type: "episodic",
          similarity_score: 0.95,
          importance_score: 0.7,
          relevance_score: 0.85,
          recall_count: 3,
          created_at: "2026-04-12T00:00:00Z",
          metadata: {},
        },
      ],
      total: 1,
      query: "user preferences",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
    });

    const result = await client.recall({
      agentId: "agent-1",
      query: "user preferences",
    });

    expect(result.total).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].content).toBe("User prefers dark mode");
    expect(result.results[0].similarity_score).toBe(0.95);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test/v1/memories/recall");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.agent_id).toBe("agent-1");
    expect(body.query).toBe("user preferences");

    vi.unstubAllGlobals();
  });

  // --- forget() ---

  it("forget() sends POST to /v1/memories/forget", async () => {
    const mockResponse = {
      deleted_count: 1,
      hard_deleted: false,
      cascade_count: 0,
      memory_ids: ["mem-123"],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
    });

    const result = await client.forget({
      agentId: "agent-1",
      memoryId: "mem-123",
    });

    expect(result.deleted_count).toBe(1);
    expect(result.hard_deleted).toBe(false);
    expect(result.memory_ids).toEqual(["mem-123"]);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test/v1/memories/forget");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.agent_id).toBe("agent-1");
    expect(body.memory_id).toBe("mem-123");

    vi.unstubAllGlobals();
  });

  // --- audit() ---

  it("audit() sends GET to /v1/audit", async () => {
    const mockResponse = {
      entries: [
        {
          id: 1,
          agent_id: "agent-1",
          user_id: null,
          operation: "store",
          memory_id: "mem-123",
          memory_type: "episodic",
          details: {},
          ip_address: "127.0.0.1",
          created_at: "2026-04-12T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      page_size: 50,
      has_next: false,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
    });

    const result = await client.audit({ agentId: "agent-1", page: 1 });

    expect(result.total).toBe(1);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].operation).toBe("store");
    expect(result.has_next).toBe(false);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/v1/audit");
    expect(url).toContain("agent_id=agent-1");
    expect(options.method).toBe("GET");

    vi.unstubAllGlobals();
  });

  // --- getMemory() ---

  it("getMemory() sends GET to /v1/memories/{id}", async () => {
    const mockResponse = {
      id: "mem-456",
      agent_id: "agent-1",
      content: "Remembered fact",
      memory_type: "semantic",
      importance_score: 0.8,
      recall_count: 5,
      created_at: "2026-04-12T00:00:00Z",
      metadata: { source: "test" },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
    });

    const result = await client.getMemory("mem-456");

    expect(result.id).toBe("mem-456");
    expect(result.content).toBe("Remembered fact");
    expect(result.memory_type).toBe("semantic");
    expect(result.importance_score).toBe(0.8);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test/v1/memories/mem-456");
    expect(options.method).toBe("GET");

    vi.unstubAllGlobals();
  });

  // --- storeBatch() ---

  it("storeBatch() sends POST to /v1/memories/batch", async () => {
    const mockResponse = {
      results: [
        {
          id: "mem-b1",
          agent_id: "agent-1",
          content: "batch 1",
          memory_type: "episodic",
          importance_score: 0.5,
          recall_count: 0,
          created_at: "2026-04-12T00:00:00Z",
          metadata: {},
        },
        {
          id: "mem-b2",
          agent_id: "agent-1",
          content: "batch 2",
          memory_type: "semantic",
          importance_score: 0.7,
          recall_count: 0,
          created_at: "2026-04-12T00:00:00Z",
          metadata: {},
        },
      ],
      stored_count: 2,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
    });

    const result = await client.storeBatch([
      { agentId: "agent-1", content: "batch 1" },
      { agentId: "agent-1", content: "batch 2", memoryType: "semantic" },
    ]);

    expect(result.stored_count).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].id).toBe("mem-b1");
    expect(result.results[1].content).toBe("batch 2");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test/v1/memories/batch");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.memories).toHaveLength(2);

    vi.unstubAllGlobals();
  });

  // --- getMemoryHistory() ---

  it("getMemoryHistory() sends GET to /v1/memories/{id}/history", async () => {
    const mockResponse = {
      memory_id: "mem-hist",
      versions: [
        {
          id: "v1",
          content: "original",
          memory_type: "episodic",
          importance_score: 0.5,
          valid_from: "2026-04-10T00:00:00Z",
          valid_to: "2026-04-12T00:00:00Z",
          metadata: {},
        },
        {
          id: "v2",
          content: "updated",
          memory_type: "episodic",
          importance_score: 0.8,
          valid_from: "2026-04-12T00:00:00Z",
          valid_to: null,
          metadata: { source: "update" },
        },
      ],
      total: 2,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
    });

    const result = await client.getMemoryHistory("mem-hist");

    expect(result.memory_id).toBe("mem-hist");
    expect(result.total).toBe(2);
    expect(result.versions).toHaveLength(2);
    expect(result.versions[0].content).toBe("original");
    expect(result.versions[1].valid_to).toBeNull();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test/v1/memories/mem-hist/history");
    expect(options.method).toBe("GET");

    vi.unstubAllGlobals();
  });

  // --- updateMemory() ---

  it("updateMemory() sends PATCH to /v1/memories/{id}", async () => {
    const mockResponse = {
      id: "mem-upd",
      agent_id: "agent-1",
      content: "updated content",
      memory_type: "episodic",
      importance_score: 0.9,
      recall_count: 3,
      created_at: "2026-04-12T00:00:00Z",
      metadata: { edited: true },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
    });

    const result = await client.updateMemory("mem-upd", {
      content: "updated content",
      importance: 0.9,
      metadata: { edited: true },
    });

    expect(result.id).toBe("mem-upd");
    expect(result.content).toBe("updated content");
    expect(result.importance_score).toBe(0.9);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test/v1/memories/mem-upd");
    expect(options.method).toBe("PATCH");
    const body = JSON.parse(options.body);
    expect(body.content).toBe("updated content");
    expect(body.importance).toBe(0.9);

    vi.unstubAllGlobals();
  });

  // --- startSession() ---

  it("startSession() sends POST to /v1/sessions", async () => {
    const mockResponse = {
      session_id: "sess-123",
      agent_id: "agent-1",
      session_type: "conversation",
      started_at: "2026-04-12T00:00:00Z",
      metadata: {},
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
    });

    const result = await client.startSession({ agentId: "agent-1" });

    expect(result.session_id).toBe("sess-123");
    expect(result.agent_id).toBe("agent-1");
    expect(result.session_type).toBe("conversation");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test/v1/sessions");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.agent_id).toBe("agent-1");
    expect(body.session_type).toBe("conversation");

    vi.unstubAllGlobals();
  });

  // --- endSession() ---

  it("endSession() sends POST to /v1/sessions/{id}/end", async () => {
    const mockResponse = {
      session_id: "sess-123",
      ended_at: "2026-04-12T01:00:00Z",
      duration_seconds: 3600,
      memory_count: 5,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
    });

    const result = await client.endSession("sess-123");

    expect(result.session_id).toBe("sess-123");
    expect(result.duration_seconds).toBe(3600);
    expect(result.memory_count).toBe(5);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test/v1/sessions/sess-123/end");
    expect(options.method).toBe("POST");

    vi.unstubAllGlobals();
  });

  // --- Retry logic ---

  it("retries on 5xx errors with exponential backoff", async () => {
    const mockSuccessResponse = {
      id: "mem-123",
      agent_id: "agent-1",
      content: "test content",
      memory_type: "episodic",
      importance_score: 0.5,
      recall_count: 0,
      created_at: "2026-04-12T00:00:00Z",
      metadata: {},
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "server error" }),
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
      maxRetries: 3,
    });

    const result = await client.store({
      agentId: "agent-1",
      content: "test content",
    });

    expect(result.id).toBe("mem-123");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it("retries on network errors", async () => {
    const mockSuccessResponse = {
      id: "mem-123",
      agent_id: "agent-1",
      content: "test content",
      memory_type: "episodic",
      importance_score: 0.5,
      recall_count: 0,
      created_at: "2026-04-12T00:00:00Z",
      metadata: {},
    };

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
      maxRetries: 3,
    });

    const result = await client.store({
      agentId: "agent-1",
      content: "test content",
    });

    expect(result.id).toBe("mem-123");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it("does not retry on 4xx errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ error: "unauthorized" }),
      headers: new Headers(),
    });

    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "bad-key",
      maxRetries: 3,
    });

    await expect(
      client.store({ agentId: "agent-1", content: "test" }),
    ).rejects.toThrow(AuthenticationError);

    // Should only be called once — no retries
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it("throws after max retries exceeded on 5xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: () => Promise.resolve({ error: "unavailable" }),
      headers: new Headers(),
    });

    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
      maxRetries: 2,
    });

    await expect(
      client.store({ agentId: "agent-1", content: "test" }),
    ).rejects.toThrow(ServerError);

    // Initial attempt + 2 retries = 3 calls
    expect(fetchMock).toHaveBeenCalledTimes(3);

    vi.unstubAllGlobals();
  });

  it("retries on 429 honoring Retry-After header", async () => {
    const mockSuccessResponse = {
      id: "mem-123",
      agent_id: "agent-1",
      content: "test content",
      memory_type: "episodic",
      importance_score: 0.5,
      recall_count: 0,
      created_at: "2026-04-12T00:00:00Z",
      metadata: {},
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: () => Promise.resolve({ error: "rate_limit_exceeded" }),
        headers: new Headers({ "Retry-After": "1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
      maxRetries: 3,
    });

    const result = await client.store({
      agentId: "agent-1",
      content: "test content",
    });

    expect(result.id).toBe("mem-123");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  // --- Timeout behavior ---

  it("throws Z3rnoTimeoutError when fetch is aborted by AbortController", async () => {
    // Mock fetch to simulate an AbortError (as thrown when AbortController fires)
    const fetchMock = vi.fn().mockImplementation(() => {
      const err = new DOMException("The operation was aborted.", "AbortError");
      return Promise.reject(err);
    });

    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
      timeout: 1, // 1ms timeout
      maxRetries: 0, // no retries so error surfaces immediately
    });

    await expect(
      client.store({ agentId: "agent-1", content: "test" }),
    ).rejects.toThrow(Z3rnoTimeoutError);

    try {
      await client.store({ agentId: "agent-1", content: "test" });
    } catch (e) {
      expect(e).toBeInstanceOf(Z3rnoTimeoutError);
      expect((e as Z3rnoTimeoutError).timeout).toBe(1);
      expect((e as Z3rnoTimeoutError).message).toContain("timed out");
    }

    vi.unstubAllGlobals();
  });

  it("throws Z3rnoTimeoutError after retries exhausted on repeated timeouts", async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      return Promise.reject(
        new DOMException("The operation was aborted.", "AbortError"),
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
      timeout: 1,
      maxRetries: 2,
    });

    await expect(
      client.store({ agentId: "agent-1", content: "test" }),
    ).rejects.toThrow(Z3rnoTimeoutError);

    // Initial attempt + 2 retries = 3 calls
    expect(fetchMock).toHaveBeenCalledTimes(3);

    vi.unstubAllGlobals();
  });

  it("Z3rnoTimeoutError includes the configured timeout value", async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      return Promise.reject(
        new DOMException("The operation was aborted.", "AbortError"),
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const client = new Z3rnoClient({
      baseUrl: "http://test",
      apiKey: "key",
      timeout: 5000,
      maxRetries: 0,
    });

    try {
      await client.store({ agentId: "agent-1", content: "test" });
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(Z3rnoTimeoutError);
      expect((e as Z3rnoTimeoutError).timeout).toBe(5000);
    }

    vi.unstubAllGlobals();
  });
});
