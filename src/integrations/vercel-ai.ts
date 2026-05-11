/**
 * Vercel AI SDK adapter for Z3rno (Phase G slice 3).
 *
 * Vercel AI SDK accepts a plain `CoreMessage[]` history; this adapter
 * loads + persists that history through Z3rno conversations. Drop the
 * `messages` accessor straight into `streamText` / `generateText`,
 * call `appendUserMessage` / `appendAssistantMessage` after each turn,
 * and Z3rno handles ordering + recall.
 *
 * Zero hard dependency on the `ai` package — we duck-type on the
 * minimal `CoreMessage` shape (`{ role, content }`).
 */

import type { Z3rnoClient } from "../client.js";

export type Z3rnoMessageRole = "user" | "assistant" | "system" | "tool";

/** Subset of Vercel `ai` `CoreMessage` the adapter needs. */
export interface CoreMessage {
  role: Z3rnoMessageRole;
  content: string;
}

export interface Z3rnoVercelMemoryOptions {
  client: Z3rnoClient;
  agentId: string;
  /** When set, recall + persisted turns are scoped to this Z3rno conversation. */
  conversationId?: string;
  /** Max history slice to load. Default 50. */
  topK?: number;
}

/**
 * Lightweight history adapter you can hand straight to Vercel AI SDK
 * helpers. `await mem.messages()` returns a CoreMessage[] ready to
 * pass to `streamText({ messages: ... })`. After each turn, call
 * `appendUserMessage` / `appendAssistantMessage` so future recalls
 * see the latest state.
 */
export class Z3rnoVercelMemory {
  private readonly client: Z3rnoClient;
  private readonly agentId: string;
  private readonly conversationId: string | undefined;
  private readonly topK: number;

  constructor(options: Z3rnoVercelMemoryOptions) {
    this.client = options.client;
    this.agentId = options.agentId;
    this.conversationId = options.conversationId;
    this.topK = options.topK ?? 50;
  }

  async messages(): Promise<CoreMessage[]> {
    if (this.conversationId) {
      // Conversation-scoped: pull turns in order.
      const page = await this.client.listTurns(this.conversationId, {
        limit: this.topK,
      });
      return page.turns.map((t) => ({
        role: this.normaliseRole(t.turn_role),
        content: t.content,
      }));
    }
    // No conversation — fall back to recall-based history (newest first).
    const resp = await this.client.recall({
      agentId: this.agentId,
      topK: this.topK,
      memoryType: "episodic",
    });
    const reversed = [...resp.results].reverse();
    return reversed.map((r) => ({
      role: this.normaliseRole(
        ((r.metadata as Record<string, unknown> | undefined) ?? {})[
          "role"
        ] as string | undefined,
      ),
      content: r.content,
    }));
  }

  async appendUserMessage(content: string): Promise<void> {
    await this.append(content, "user");
  }

  async appendAssistantMessage(content: string): Promise<void> {
    await this.append(content, "assistant");
  }

  async appendToolMessage(content: string): Promise<void> {
    await this.append(content, "tool");
  }

  private async append(content: string, role: Z3rnoMessageRole): Promise<void> {
    const memory = await this.client.store({
      agentId: this.agentId,
      content,
      memoryType: "episodic",
      metadata: { role },
      relationships: [],
    });
    if (this.conversationId) {
      await this.client.addTurn(this.conversationId, {
        memoryId: memory.id,
        turnRole: role,
      });
    }
  }

  private normaliseRole(raw: string | undefined): Z3rnoMessageRole {
    switch (raw) {
      case "assistant":
      case "ai":
        return "assistant";
      case "system":
        return "system";
      case "tool":
        return "tool";
      default:
        return "user";
    }
  }
}
