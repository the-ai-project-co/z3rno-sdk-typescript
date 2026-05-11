/**
 * v0.20.3 — TS SDK tests for /v1/tenants/me/budgets.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { Z3rnoClient } from "../src/client.js";

function makeClient(): Z3rnoClient {
  return new Z3rnoClient({ baseUrl: "http://test", apiKey: "sk-test" });
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

describe("Z3rnoClient — tenant budgets", () => {
  it("getMyBudgets parses TenantBudgetsView", async () => {
    vi.stubGlobal("fetch", fetchOk(view(5000)));
    const out = await makeClient().getMyBudgets();
    expect(out.overrides.daily_tokens).toBe(5000);
    expect(out.effective.daily_tokens).toBe(5000);
  });

  it("setMyBudgets fills missing fields with 0 and PUTs", async () => {
    const stub = fetchOk(view(2500));
    vi.stubGlobal("fetch", stub);
    await makeClient().setMyBudgets({ daily_tokens: 2500 });
    const call = (stub as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = call?.[1] as { method?: string; body?: string } | undefined;
    expect(init?.method).toBe("PUT");
    const body = JSON.parse(init?.body ?? "{}");
    expect(body.daily_tokens).toBe(2500);
    expect(body.monthly_tokens).toBe(0);
    expect(body.daily_llm_calls).toBe(0);
  });

  it("setMyBudgets({}) submits all-zero (reset to defaults)", async () => {
    const stub = fetchOk(view(0));
    vi.stubGlobal("fetch", stub);
    await makeClient().setMyBudgets({});
    const init = (stub as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
      | { body?: string }
      | undefined;
    const body = JSON.parse(init?.body ?? "{}");
    expect(Object.values(body)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
