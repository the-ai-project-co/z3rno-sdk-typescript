/**
 * Z3rno TypeScript SDK client.
 *
 * Thin fetch wrapper — no database drivers, no embedding providers.
 *
 * @example
 * ```ts
 * const client = new Z3rnoClient({ baseUrl: "http://localhost:8000", apiKey: "z3rno_sk_..." });
 * const memory = await client.store({ agentId: "agent-1", content: "User prefers dark mode" });
 * const results = await client.recall({ agentId: "agent-1", query: "user preferences" });
 * await client.forget({ agentId: "agent-1", memoryId: memory.id });
 * ```
 */

import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
  Z3rnoError,
} from "./errors.js";
import type {
  AuditPageResponse,
  ForgetResponse,
  MemoryResponse,
  RecallResponse,
  StoreMemoryRequest,
} from "./models.js";
import {
  AuditPageResponse as AuditPageSchema,
  ForgetResponse as ForgetSchema,
  MemoryResponse as MemorySchema,
  RecallResponse as RecallSchema,
} from "./models.js";

export interface Z3rnoClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
}

export class Z3rnoClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: Z3rnoClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
  }

  // --- Store ---

  async store(request: StoreMemoryRequest): Promise<MemoryResponse> {
    const body = {
      agent_id: request.agentId,
      content: request.content,
      memory_type: request.memoryType,
      user_id: request.userId,
      metadata: request.metadata,
      relationships: request.relationships?.map((r) => ({
        target_memory_id: r.targetMemoryId,
        relationship_type: r.relationshipType,
        weight: r.weight,
        metadata: r.metadata,
      })),
      ttl_seconds: request.ttlSeconds,
      importance: request.importance,
    };

    const resp = await this.request("POST", "/v1/memories", body);
    return MemorySchema.parse(resp);
  }

  // --- Recall ---

  async recall(params: {
    agentId: string;
    query?: string;
    memoryType?: string;
    filters?: Record<string, unknown>;
    topK?: number;
    similarityThreshold?: number;
  }): Promise<RecallResponse> {
    const body = {
      agent_id: params.agentId,
      query: params.query,
      memory_type: params.memoryType,
      filters: params.filters,
      top_k: params.topK ?? 10,
      similarity_threshold: params.similarityThreshold ?? 0,
    };

    const resp = await this.request("POST", "/v1/memories/recall", body);
    return RecallSchema.parse(resp);
  }

  // --- Forget ---

  async forget(params: {
    agentId: string;
    memoryId?: string;
    memoryIds?: string[];
    hardDelete?: boolean;
    cascade?: boolean;
    reason?: string;
  }): Promise<ForgetResponse> {
    const body = {
      agent_id: params.agentId,
      memory_id: params.memoryId,
      memory_ids: params.memoryIds,
      hard_delete: params.hardDelete ?? false,
      cascade: params.cascade ?? false,
      reason: params.reason,
    };

    const resp = await this.request("POST", "/v1/memories/forget", body);
    return ForgetSchema.parse(resp);
  }

  // --- Audit ---

  async audit(params?: {
    agentId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AuditPageResponse> {
    const searchParams = new URLSearchParams();
    if (params?.agentId) searchParams.set("agent_id", params.agentId);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize)
      searchParams.set("page_size", String(params.pageSize));

    const query = searchParams.toString();
    const path = query ? `/v1/audit?${query}` : "/v1/audit";
    const resp = await this.request("GET", path);
    return AuditPageSchema.parse(resp);
  }

  // --- HTTP layer ---

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "@z3rno/sdk/0.0.1",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Z3rnoError) throw error;
      throw new Z3rnoError(`Request failed: ${String(error)}`);
    }
  }

  private async handleResponse(resp: Response): Promise<unknown> {
    if (resp.ok) {
      return resp.json();
    }

    let detail = resp.statusText;
    try {
      const body = (await resp.json()) as Record<string, unknown>;
      detail = String(body.detail ?? body.error ?? resp.statusText);
    } catch {
      // Not JSON
    }

    switch (resp.status) {
      case 401:
        throw new AuthenticationError(`Authentication failed: ${detail}`);
      case 404:
        throw new NotFoundError(`Not found: ${detail}`);
      case 429: {
        const retryAfter = parseInt(
          resp.headers.get("Retry-After") ?? "60",
          10,
        );
        throw new RateLimitError(`Rate limit exceeded: ${detail}`, retryAfter);
      }
      case 400:
      case 422:
        throw new ValidationError(detail, resp.status);
      default:
        if (resp.status >= 500) {
          throw new ServerError(`Server error: ${detail}`, resp.status);
        }
        throw new Z3rnoError(
          `Unexpected error (${resp.status}): ${detail}`,
          resp.status,
        );
    }
  }
}
