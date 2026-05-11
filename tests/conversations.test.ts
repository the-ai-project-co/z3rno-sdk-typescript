/**
 * Phase G slice 2/3 — conversation methods + Vercel AI + Mastra adapters.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { Z3rnoClient } from "../src/client.js";
import { Z3rnoVercelMemory } from "../src/integrations/vercel-ai.js";
import { Z3rnoMastraMemory } from "../src/integrations/mastra.js";

function makeClient(): Z3rnoClient {
  return new Z3rnoClient({ baseUrl: "http://test", apiKey: "sk-test" });
}

function fetchOk(json: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(json),
  }) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Z3rnoClient — conversations", () => {
  it("createConversation POSTs to /v1/conversations with snake_case body", async () => {
    const stub = fetchOk({
      id: "c-1",
      agent_id: "a-1",
      user_id: null,
      title: "demo",
      summary_cadence: 5,
      turn_count: 0,
      last_summary_turn: 0,
      metadata: {},
      created_at: "2026-05-11T00:00:00Z",
      updated_at: "2026-05-11T00:00:00Z",
    });
    vi.stubGlobal("fetch", stub);
    const client = makeClient();

    const conv = await client.createConversation({
      agentId: "a-1",
      title: "demo",
      summaryCadence: 5,
    });
    expect(conv.id).toBe("c-1");
    expect(conv.summary_cadence).toBe(5);
    const call = (stub as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = call?.[1] as { body?: string } | undefined;
    const body = JSON.parse(init?.body ?? "{}");
    expect(body.agent_id).toBe("a-1");
    expect(body.summary_cadence).toBe(5);
  });

  it("addTurn returns turn_index and needs_summary", async () => {
    vi.stubGlobal("fetch", fetchOk({ turn_index: 7, needs_summary: true }));
    const client = makeClient();
    const out = await client.addTurn("c-1", {
      memoryId: "m-1",
      turnRole: "assistant",
    });
    expect(out.turn_index).toBe(7);
    expect(out.needs_summary).toBe(true);
  });

  it("listTurns sends GET with after_turn + limit query params", async () => {
    const stub = fetchOk({
      turns: [
        {
          memory_id: "m-1",
          turn_index: 6,
          turn_role: "user",
          content: "hi",
          created_at: "2026-05-11T00:00:00Z",
        },
      ],
      total: 1,
      conversation_id: "c-1",
    });
    vi.stubGlobal("fetch", stub);
    const client = makeClient();

    const out = await client.listTurns("c-1", { afterTurn: 5, limit: 10 });
    expect(out.turns).toHaveLength(1);
    expect(out.turns[0]?.turn_index).toBe(6);
    const url = (stub as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(String(url)).toContain("after_turn=5");
    expect(String(url)).toContain("limit=10");
  });

  it("recall forwards conversationId as conversation_id", async () => {
    const stub = fetchOk({
      results: [],
      total: 0,
      query: "q",
      strategy_used: "AUTO",
      strategies_considered: [],
      reranked: false,
      elapsed_ms: 1.0,
    });
    vi.stubGlobal("fetch", stub);
    const client = makeClient();

    await client.recall({
      agentId: "a-1",
      query: "q",
      conversationId: "c-1",
    });
    const call = (stub as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = call?.[1] as { body?: string } | undefined;
    const body = JSON.parse(init?.body ?? "{}");
    expect(body.conversation_id).toBe("c-1");
  });
});

describe("Z3rnoVercelMemory adapter", () => {
  it("appendUserMessage stores then addTurn when conversation is set", async () => {
    const calls: Array<{ method: string; path: string }> = [];
    const stub = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      calls.push({ method: init.method ?? "GET", path: String(url) });
      // Return shapes the client schemas expect for each path.
      if (String(url).includes("/v1/memories") && init.method === "POST" &&
          !String(url).includes("/forget") && !String(url).includes("/recall")) {
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              id: "m-1",
              agent_id: "a-1",
              content: "x",
              memory_type: "episodic",
              importance_score: 0.5,
              recall_count: 0,
              created_at: "2026-05-11T00:00:00Z",
              metadata: {},
            }),
        };
      }
      if (String(url).includes("/turns")) {
        return {
          ok: true,
          json: () => Promise.resolve({ turn_index: 1, needs_summary: false }),
        };
      }
      return { ok: true, json: () => Promise.resolve({}) };
    });
    vi.stubGlobal("fetch", stub as unknown as typeof fetch);

    const client = makeClient();
    const mem = new Z3rnoVercelMemory({
      client,
      agentId: "a-1",
      conversationId: "c-1",
    });
    await mem.appendUserMessage("hello");

    expect(calls).toHaveLength(2);
    expect(calls[0]?.path).toContain("/v1/memories");
    expect(calls[1]?.path).toContain("/v1/conversations/c-1/turns");
  });

  it("appendUserMessage skips addTurn when no conversation", async () => {
    const stub = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "m-1",
          agent_id: "a-1",
          content: "x",
          memory_type: "episodic",
          importance_score: 0.5,
          recall_count: 0,
          created_at: "2026-05-11T00:00:00Z",
          metadata: {},
        }),
    }));
    vi.stubGlobal("fetch", stub as unknown as typeof fetch);
    const client = makeClient();
    const mem = new Z3rnoVercelMemory({ client, agentId: "a-1" });
    await mem.appendUserMessage("hi");
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it("messages() pulls turns when conversationId is set", async () => {
    vi.stubGlobal(
      "fetch",
      fetchOk({
        turns: [
          {
            memory_id: "m-1",
            turn_index: 1,
            turn_role: "user",
            content: "hi",
            created_at: "2026-05-11T00:00:00Z",
          },
          {
            memory_id: "m-2",
            turn_index: 2,
            turn_role: "assistant",
            content: "hello",
            created_at: "2026-05-11T00:00:00Z",
          },
        ],
        total: 2,
        conversation_id: "c-1",
      }),
    );
    const client = makeClient();
    const mem = new Z3rnoVercelMemory({
      client,
      agentId: "a-1",
      conversationId: "c-1",
    });
    const msgs = await mem.messages();
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant"]);
  });
});

describe("Z3rnoMastraMemory adapter", () => {
  it("getMessages pulls turns in order", async () => {
    vi.stubGlobal(
      "fetch",
      fetchOk({
        turns: [
          {
            memory_id: "m-1",
            turn_index: 1,
            turn_role: "user",
            content: "first",
            created_at: "2026-05-11T00:00:00Z",
          },
        ],
        total: 1,
        conversation_id: "c-1",
      }),
    );
    const client = makeClient();
    const mem = new Z3rnoMastraMemory({
      client,
      agentId: "a-1",
      conversationId: "c-1",
    });
    const msgs = await mem.getMessages();
    expect(msgs[0]?.content).toBe("first");
    expect(msgs[0]?.threadId).toBe("c-1");
  });

  it("clear is a deliberate no-op", async () => {
    const stub = vi.fn();
    vi.stubGlobal("fetch", stub as unknown as typeof fetch);
    const client = makeClient();
    const mem = new Z3rnoMastraMemory({ client, agentId: "a-1" });
    await mem.clear();
    expect(stub).not.toHaveBeenCalled();
  });
});
