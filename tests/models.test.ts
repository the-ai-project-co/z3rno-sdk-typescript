import { describe, expect, it } from "vitest";
import {
  AuditPageResponse,
  ForgetResponse,
  MemoryResponse,
  MemoryType,
  RecallResponse,
  RelationshipType,
  StoreMemoryRequest,
} from "../src/models.js";

describe("MemoryType enum", () => {
  it("has four values", () => {
    expect(MemoryType.options).toEqual([
      "working",
      "episodic",
      "semantic",
      "procedural",
    ]);
  });
});

describe("RelationshipType enum", () => {
  it("has six values", () => {
    expect(RelationshipType.options).toHaveLength(6);
  });
});

describe("StoreMemoryRequest", () => {
  it("parses valid request", () => {
    const result = StoreMemoryRequest.safeParse({
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      content: "test content",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = StoreMemoryRequest.safeParse({
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("defaults memoryType to episodic", () => {
    const result = StoreMemoryRequest.parse({
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      content: "test",
    });
    expect(result.memoryType).toBe("episodic");
  });

  it("rejects invalid UUID for agentId", () => {
    const result = StoreMemoryRequest.safeParse({
      agentId: "not-a-uuid",
      content: "test",
    });
    expect(result.success).toBe(false);
  });
});

describe("MemoryResponse", () => {
  it("parses valid response", () => {
    const result = MemoryResponse.safeParse({
      id: "mem-123",
      agent_id: "agent-1",
      content: "test",
      memory_type: "episodic",
      importance_score: 0.5,
      recall_count: 0,
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("RecallResponse", () => {
  it("parses empty results", () => {
    const result = RecallResponse.parse({
      results: [],
      total: 0,
    });
    expect(result.results).toHaveLength(0);
    expect(result.query).toBeUndefined();
  });
});

describe("ForgetResponse", () => {
  it("parses valid response", () => {
    const result = ForgetResponse.parse({
      deleted_count: 2,
      hard_deleted: true,
      cascade_count: 1,
      memory_ids: ["a", "b"],
    });
    expect(result.deleted_count).toBe(2);
    expect(result.hard_deleted).toBe(true);
  });
});

describe("AuditPageResponse", () => {
  it("parses valid page", () => {
    const result = AuditPageResponse.parse({
      entries: [],
      total: 0,
      page: 1,
      page_size: 50,
      has_next: false,
    });
    expect(result.has_next).toBe(false);
  });

  it("exposes total_count + timestamp aliases (v0.8.1)", () => {
    const result = AuditPageResponse.parse({
      entries: [
        {
          id: 1,
          operation: "store",
          created_at: "2026-05-13T00:00:00Z",
        },
      ],
      total: 7,
      page: 1,
      page_size: 50,
      has_next: false,
    });
    expect(result.total_count).toBe(7);
    expect(result.total_count).toBe(result.total);
    expect(result.entries[0].timestamp).toBe("2026-05-13T00:00:00Z");
    expect(result.entries[0].timestamp).toBe(result.entries[0].created_at);
  });
});
