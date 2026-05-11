import { afterEach, describe, expect, it, vi } from "vitest";
import { Z3rnoClient } from "../src/client.js";

function makeClient(): Z3rnoClient {
  return new Z3rnoClient({
    baseUrl: "http://test.z3rno.dev",
    apiKey: "test-key",
    timeout: 5000,
  });
}

function mockOk(body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      json: () => Promise.resolve(body),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Forge SDK methods", () => {
  // -------------------------------------------------------------------------
  // ingest
  // -------------------------------------------------------------------------

  it("ingestText() POSTs /v1/ingest with kind=text", async () => {
    mockOk({
      job_id: "ij-1",
      kind: "text",
      status: "queued",
      dataset_id: null,
      enqueued_at: "2026-05-11T00:00:00Z",
    });
    const client = makeClient();
    const job = await client.ingestText({
      agentId: "agent-1",
      text: "hello world",
    });
    expect(job.job_id).toBe("ij-1");
    expect(job.kind).toBe("text");

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("http://test.z3rno.dev/v1/ingest");
    expect(call[1].method).toBe("POST");
    const body = JSON.parse(call[1].body as string);
    expect(body).toEqual({
      kind: "text",
      agent_id: "agent-1",
      text: "hello world",
    });
  });

  it("ingestText() threads dataset_id when provided", async () => {
    mockOk({
      job_id: "ij-2",
      kind: "text",
      status: "queued",
      dataset_id: "ds-1",
      enqueued_at: "2026-05-11T00:00:00Z",
    });
    const client = makeClient();
    await client.ingestText({
      agentId: "a",
      text: "x",
      datasetId: "ds-1",
    });
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.dataset_id).toBe("ds-1");
  });

  it("ingestUrl() POSTs /v1/ingest with kind=url", async () => {
    mockOk({
      job_id: "ij-url",
      kind: "url",
      status: "queued",
      dataset_id: null,
      enqueued_at: "2026-05-11T00:00:00Z",
    });
    const client = makeClient();
    const job = await client.ingestUrl({
      agentId: "agent-1",
      url: "https://example.com",
    });
    expect(job.kind).toBe("url");
  });

  it("getIngestStatus() GETs /v1/ingest/{id}", async () => {
    mockOk({
      job_id: "ij-1",
      agent_id: "agent-1",
      dataset_id: null,
      kind: "text",
      status: "completed",
      source_uri: null,
      content_type: null,
      filename: null,
      file_size: 11,
      memory_ids: ["mem-1"],
      memos_written: 1,
      distill_job_id: null,
      codegraph_memos_written: 0,
      codegraph_edges_written: 0,
      error: null,
      warnings: [],
      started_at: null,
      completed_at: null,
      created_at: null,
      updated_at: null,
    });
    const client = makeClient();
    const status = await client.getIngestStatus("ij-1");
    expect(status.memos_written).toBe(1);
    expect(status.memory_ids).toEqual(["mem-1"]);
  });

  // -------------------------------------------------------------------------
  // distill
  // -------------------------------------------------------------------------

  it("distill() POSTs /v1/distill with memory_ids", async () => {
    mockOk({
      job_id: "dj-1",
      status: "queued",
      memory_ids: ["m-1", "m-2"],
      enqueued_at: "2026-05-11T00:00:00Z",
    });
    const client = makeClient();
    const job = await client.distill({
      agentId: "agent-1",
      memoryIds: ["m-1", "m-2"],
    });
    expect(job.job_id).toBe("dj-1");
    expect(job.memory_ids).toEqual(["m-1", "m-2"]);

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.include_summary).toBe(true);
  });

  it("distill() threads tuning kwargs", async () => {
    mockOk({
      job_id: "dj",
      status: "queued",
      memory_ids: ["m"],
      enqueued_at: "2026-05-11T00:00:00Z",
    });
    const client = makeClient();
    await client.distill({
      agentId: "a",
      memoryIds: ["m"],
      chunkSize: 512,
      chunkOverlap: 64,
      maxConcurrency: 2,
      summaryStyle: "bullet",
      includeSummary: false,
    });
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body).toMatchObject({
      chunk_size: 512,
      chunk_overlap: 64,
      max_concurrency: 2,
      summary_style: "bullet",
      include_summary: false,
    });
  });

  it("getDistillStatus() GETs /v1/distill/{id}", async () => {
    mockOk({
      job_id: "dj-1",
      agent_id: "agent-1",
      status: "completed",
      model: "openai/gpt-4o-mini",
      memory_ids: ["m-1"],
      chunk_size: 1024,
      chunk_overlap: 128,
      max_concurrency: 4,
      chunks_total: 3,
      chunks_failed: 0,
      entities_extracted: 12,
      relationships_extracted: 5,
      memos_written: 17,
      error: null,
    });
    const client = makeClient();
    const status = await client.getDistillStatus("dj-1");
    expect(status.memos_written).toBe(17);
  });

  // -------------------------------------------------------------------------
  // refine
  // -------------------------------------------------------------------------

  it("refine() POSTs /v1/refine with empty body when no dataset", async () => {
    mockOk({
      job_id: "rj-1",
      status: "queued",
      dataset_id: null,
      enqueued_at: "2026-05-11T00:00:00Z",
    });
    const client = makeClient();
    const job = await client.refine();
    expect(job.job_id).toBe("rj-1");
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body).toEqual({});
  });

  it("refine() threads dataset_id", async () => {
    mockOk({
      job_id: "rj-2",
      status: "queued",
      dataset_id: "ds-1",
      enqueued_at: "2026-05-11T00:00:00Z",
    });
    const client = makeClient();
    await client.refine({ datasetId: "ds-1" });
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.dataset_id).toBe("ds-1");
  });

  it("getRefineStatus() GETs /v1/refine/{id}", async () => {
    mockOk({
      job_id: "rj-1",
      status: "completed",
      dataset_id: null,
      trigger: "api",
      memos_scanned: 100,
      memos_deduped: 12,
      edges_reweighted: 5,
      edges_pruned: 2,
      feedback_drained: 18,
      job_metadata: {},
      error: null,
    });
    const client = makeClient();
    const status = await client.getRefineStatus("rj-1");
    expect(status.memos_deduped).toBe(12);
    expect(status.feedback_drained).toBe(18);
  });
});
