/**
 * v0.22.1 — TS SDK tests for client.admin.{getBudgets,setBudgets} (slice 21.3).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminAPI, Z3rnoClient } from "../src/client.js";

const ORG_ID = "11111111-1111-1111-1111-111111111111";

function makeClient(): Z3rnoClient {
  return new Z3rnoClient({ baseUrl: "http://test", apiKey: "sa-key" });
}

function fetchOk(json: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(json),
  }) as unknown as typeof fetch;
}

const view = (tokens = 1000) => ({
  overrides: {
    daily_tokens: tokens,
    daily_llm_calls: 0,
    daily_embeddings: 0,
    monthly_tokens: 0,
    monthly_llm_calls: 0,
    monthly_embeddings: 0,
  },
  effective: {
    daily_tokens: tokens,
    daily_llm_calls: 0,
    daily_embeddings: 0,
    monthly_tokens: 0,
    monthly_llm_calls: 0,
    monthly_embeddings: 0,
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Z3rnoClient.admin — cross-tenant budgets", () => {
  it("admin is exposed as an AdminAPI", () => {
    expect(makeClient().admin).toBeInstanceOf(AdminAPI);
  });

  it("getBudgets hits the {org_id} path", async () => {
    const stub = fetchOk(view(7000));
    vi.stubGlobal("fetch", stub);
    const out = await makeClient().admin.getBudgets(ORG_ID);
    expect(out.overrides.daily_tokens).toBe(7000);

    const call = (stub as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call?.[0] as string;
    expect(url).toContain(`/v1/tenants/${ORG_ID}/budgets`);
  });

  it("setBudgets sends a PUT with zero-filled body", async () => {
    const stub = fetchOk(view(9000));
    vi.stubGlobal("fetch", stub);
    await makeClient().admin.setBudgets(ORG_ID, { daily_tokens: 9000 });

    const call = (stub as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = call?.[1] as { method?: string; body?: string } | undefined;
    expect(init?.method).toBe("PUT");
    const body = JSON.parse(init?.body ?? "{}");
    expect(body.daily_tokens).toBe(9000);
    expect(body.monthly_tokens).toBe(0);
  });

  it("setBudgets({}) submits all-zero", async () => {
    const stub = fetchOk(view(0));
    vi.stubGlobal("fetch", stub);
    await makeClient().admin.setBudgets(ORG_ID, {});
    const init = (stub as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
      | { body?: string }
      | undefined;
    const body = JSON.parse(init?.body ?? "{}");
    expect(Object.values(body)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
