// Slice 21.6 — pin that the TS SDK handles the actual HTTP status
// codes the server returns: 202 Accepted for every async-job verb
// (ingest / distill / refine) and 204 No Content for DELETE-style
// endpoints (deleteConversation, key revoke). The Python SDK had a
// status-code-set mismatch closed in z3rno 0.7.1 (Bug A from the
// 2026-05-12 starter-kit smoke); these vitest cases assert the TS
// surface doesn't share the same gap and serve as a regression gate
// going forward.

import { afterEach, describe, expect, it, vi } from "vitest";

import { Z3rnoClient } from "../src/client.js";

function makeClient(): Z3rnoClient {
  return new Z3rnoClient({
    baseUrl: "http://test.z3rno.dev",
    apiKey: "test-key",
    timeout: 5000,
    maxRetries: 0, // no retries — surface real failures quickly
  });
}

// Mock a real-shaped server response: an actual Response would have a
// proper status code (not lying with 200 like the existing tests do).
function mockServerResponse(status: number, body?: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const init: ResponseInit = {
        status,
        headers: { "Content-Type": "application/json" },
      };
      // The Fetch spec forbids bodies on 204 — `new Response("", ...)`
      // rejects with "Invalid response status code 204". Use null
      // (which Response treats as no body) for the 204 / 304 cases.
      if (status === 204 || status === 304) {
        return Promise.resolve(new Response(null, init));
      }
      const payload = body === undefined ? "" : JSON.stringify(body);
      return Promise.resolve(new Response(payload, init));
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("status code handling — 202 Accepted (async-job verbs)", () => {
  it("ingestText() accepts 202 and returns the job envelope", async () => {
    mockServerResponse(202, {
      job_id: "job_ingest_abc",
      kind: "text",
      status: "queued",
      dataset_id: null,
      enqueued_at: "2026-05-12T09:01:58Z",
    });
    const client = makeClient();
    const resp = await client.ingestText({
      agentId: "agent-1",
      text: "hello world",
    });
    expect(resp.job_id).toBe("job_ingest_abc");
    expect(resp.status).toBe("queued");
  });

  it("ingestUrl() accepts 202", async () => {
    mockServerResponse(202, {
      job_id: "job_url_abc",
      kind: "url",
      status: "queued",
      dataset_id: null,
      enqueued_at: "2026-05-12T09:01:58Z",
    });
    const client = makeClient();
    const resp = await client.ingestUrl({
      agentId: "agent-1",
      url: "https://example.com",
    });
    expect(resp.job_id).toBe("job_url_abc");
  });

  it("getIngestStatus() accepts 202", async () => {
    mockServerResponse(202, {
      job_id: "job_ingest_abc",
      agent_id: "agent-1",
      kind: "text",
      status: "running",
    });
    const client = makeClient();
    const resp = await client.getIngestStatus("job_ingest_abc");
    expect(resp.status).toBe("running");
  });

  it("distill() accepts 202", async () => {
    mockServerResponse(202, {
      job_id: "job_distill_abc",
      status: "queued",
      memory_ids: ["mem_1", "mem_2"],
      enqueued_at: "2026-05-12T09:01:58Z",
    });
    const client = makeClient();
    const resp = await client.distill({
      agentId: "agent-1",
      memoryIds: ["mem_1", "mem_2"],
    });
    expect(resp.job_id).toBe("job_distill_abc");
  });

  it("getDistillStatus() accepts 202", async () => {
    mockServerResponse(202, {
      job_id: "job_distill_abc",
      agent_id: "agent-1",
      status: "running",
      model: "openai/gpt-4o-mini",
      memory_ids: ["mem_1"],
      chunk_size: 1024,
      chunk_overlap: 128,
      max_concurrency: 4,
      chunks_total: 0,
      chunks_failed: 0,
      entities_extracted: 0,
      relationships_extracted: 0,
      memos_written: 0,
    });
    const client = makeClient();
    const resp = await client.getDistillStatus("job_distill_abc");
    expect(resp.status).toBe("running");
  });

  it("refine() accepts 202", async () => {
    mockServerResponse(202, {
      job_id: "job_refine_abc",
      status: "queued",
      dataset_id: null,
      enqueued_at: "2026-05-12T09:01:58Z",
    });
    const client = makeClient();
    const resp = await client.refine({});
    expect(resp.job_id).toBe("job_refine_abc");
  });

  it("getRefineStatus() accepts 202", async () => {
    mockServerResponse(202, {
      job_id: "job_refine_abc",
      status: "running",
      trigger: "manual",
    });
    const client = makeClient();
    const resp = await client.getRefineStatus("job_refine_abc");
    expect(resp.status).toBe("running");
  });
});

describe("status code handling — 204 No Content (DELETE verbs)", () => {
  it("deleteConversation() accepts 204 with an empty body", async () => {
    mockServerResponse(204);
    const client = makeClient();
    // Should resolve without throwing. Return type is void.
    await expect(client.deleteConversation("conv_abc")).resolves.toBeUndefined();
  });

  it("deleteConversation() doesn't fall through to the error branch on 204", async () => {
    // Belt-and-braces: explicit assertion that no error is raised
    // even when the server omits the body entirely. Before the
    // fix in this slice, resp.json() on an empty body rejected
    // with SyntaxError and the request retry loop burned through
    // every attempt until timeout.
    mockServerResponse(204);
    const client = makeClient();
    let threw = false;
    try {
      await client.deleteConversation("conv_abc");
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});
