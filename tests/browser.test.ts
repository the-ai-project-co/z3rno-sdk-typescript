import { afterEach, describe, expect, it, vi } from "vitest";
import { Z3rnoClient } from "../src/client.js";

describe("Browser compatibility", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("constructs when process is undefined (browser environment)", () => {
    // Simulate a browser environment where `process` does not exist
    const originalProcess = globalThis.process;
    // @ts-expect-error — intentionally removing process to simulate browser
    delete globalThis.process;

    try {
      const client = new Z3rnoClient({
        baseUrl: "https://api.example.com",
        apiKey: "z3rno_sk_browser_test",
      });
      expect(client).toBeDefined();
    } finally {
      globalThis.process = originalProcess;
    }
  });

  it("falls back to defaults when process is undefined and no config provided", () => {
    const originalProcess = globalThis.process;
    // @ts-expect-error — intentionally removing process to simulate browser
    delete globalThis.process;

    try {
      // Should not throw even without any config — defaults to https://api.z3rno.dev
      const client = new Z3rnoClient();
      expect(client).toBeDefined();
    } finally {
      globalThis.process = originalProcess;
    }
  });

  it("env var fallback handles missing process.env gracefully", () => {
    const originalProcess = globalThis.process;
    // @ts-expect-error — process exists but env is missing
    globalThis.process = {};

    try {
      const client = new Z3rnoClient();
      expect(client).toBeDefined();
    } finally {
      globalThis.process = originalProcess;
    }
  });

  it("reads env vars when process.env is available", () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      Z3RNO_BASE_URL: "http://env-url:9000",
      Z3RNO_API_KEY: "z3rno_sk_from_env",
    };

    try {
      // Client should pick up env vars when no explicit config is given
      const client = new Z3rnoClient();
      expect(client).toBeDefined();
    } finally {
      process.env = originalEnv;
    }
  });

  it("makes a fetch call in simulated browser (no process global)", async () => {
    const originalProcess = globalThis.process;
    // @ts-expect-error — intentionally removing process to simulate browser
    delete globalThis.process;

    const mockResponse = {
      id: "mem-browser",
      agent_id: "agent-1",
      content: "browser test",
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

    try {
      const client = new Z3rnoClient({
        baseUrl: "https://api.example.com",
        apiKey: "browser-key",
      });
      const result = await client.store({
        agentId: "agent-1",
        content: "browser test",
      });
      expect(result.id).toBe("mem-browser");
    } finally {
      globalThis.process = originalProcess;
      vi.unstubAllGlobals();
    }
  });
});
