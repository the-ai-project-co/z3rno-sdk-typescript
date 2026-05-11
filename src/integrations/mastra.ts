/**
 * Mastra adapter for Z3rno (Phase G slice 3).
 *
 * Mastra exposes a `MastraMemory`-shaped interface — see
 * https://mastra.ai/docs/agents/memory. This adapter implements
 * the same surface (`getMessages` / `addMessage` / `clear`) using
 * Z3rno conversations as the backing store.
 *
 * Zero hard dependency on the `@mastra/core` package — we provide
 * the typed surface and Mastra's runtime accepts any conforming
 * object.
 */

import type { Z3rnoClient } from "../client.js";

export type MastraRole = "user" | "assistant" | "system" | "tool";

export interface MastraMessage {
  role: MastraRole;
  content: string;
  threadId?: string;
  resourceId?: string;
}

export interface Z3rnoMastraMemoryOptions {
  client: Z3rnoClient;
  agentId: string;
  /** Mastra's thread is Z3rno's conversation; supply or look up by threadId. */
  conversationId?: string;
  topK?: number;
}

/**
 * Mastra-compatible memory backed by Z3rno conversations. Plug into
 * a Mastra `Agent`:
 *
 *   const memory = new Z3rnoMastraMemory({ client, agentId, conversationId });
 *   const agent = new Agent({ name: "support", memory });
 */
export class Z3rnoMastraMemory {
  private readonly client: Z3rnoClient;
  private readonly agentId: string;
  private readonly conversationId: string | undefined;
  private readonly topK: number;

  constructor(options: Z3rnoMastraMemoryOptions) {
    this.client = options.client;
    this.agentId = options.agentId;
    this.conversationId = options.conversationId;
    this.topK = options.topK ?? 50;
  }

  /** Mastra contract: return ordered prior messages for the thread. */
  async getMessages(_args?: { limit?: number }): Promise<MastraMessage[]> {
    const limit = _args?.limit ?? this.topK;
    if (this.conversationId) {
      const page = await this.client.listTurns(this.conversationId, { limit });
      return page.turns.map((t) => ({
        role: this.normaliseRole(t.turn_role),
        content: t.content,
        threadId: this.conversationId,
      }));
    }
    const resp = await this.client.recall({
      agentId: this.agentId,
      topK: limit,
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

  /** Mastra contract: persist one message. */
  async addMessage(message: MastraMessage): Promise<void> {
    const memory = await this.client.store({
      agentId: this.agentId,
      content: message.content,
      memoryType: "episodic",
      metadata: { role: message.role },
      relationships: [],
    });
    if (this.conversationId) {
      await this.client.addTurn(this.conversationId, {
        memoryId: memory.id,
        turnRole: message.role,
      });
    }
  }

  /**
   * Mastra `clear()` — deliberate no-op. Z3rno keeps the source of
   * truth and recall is already scoped per conversation; flushing
   * the thread would risk losing audit-relevant history.
   */
  async clear(): Promise<void> {
    return;
  }

  private normaliseRole(raw: string | undefined): MastraRole {
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
