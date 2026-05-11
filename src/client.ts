/**
 * Z3rno TypeScript SDK client.
 *
 * Thin fetch wrapper — no database drivers, no embedding providers.
 * Works in Node.js 18+, Deno, Bun, and modern browsers (any runtime
 * with a global `fetch` and `AbortController`).
 *
 * @module client
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
  Z3rnoConnectionError,
  Z3rnoError,
  Z3rnoTimeoutError,
} from "./errors.js";
import type {
  AuditPageResponse,
  BatchStoreResponse,
  ConversationResponse,
  DistillJobResponse,
  DistillJobStatusResponse,
  EndSessionResponse,
  ForgetResponse,
  IngestJobResponse,
  IngestJobStatusResponse,
  MemoryHistoryResponse,
  MemoryResponse,
  RecallResponse,
  RefineJobResponse,
  RefineJobStatusResponse,
  SessionResponse,
  StoreMemoryRequest,
  TenantBudgets,
  TenantBudgetsView,
  TurnAddResponse,
  TurnListResponse,
} from "./models.js";
import {
  AuditPageResponse as AuditPageSchema,
  BatchStoreResponse as BatchStoreSchema,
  ConversationResponse as ConversationSchema,
  DistillJobResponse as DistillJobSchema,
  DistillJobStatusResponse as DistillJobStatusSchema,
  EndSessionResponse as EndSessionSchema,
  ForgetResponse as ForgetSchema,
  IngestJobResponse as IngestJobSchema,
  IngestJobStatusResponse as IngestJobStatusSchema,
  MemoryHistoryResponse as MemoryHistorySchema,
  MemoryResponse as MemorySchema,
  RecallResponse as RecallSchema,
  RefineJobResponse as RefineJobSchema,
  RefineJobStatusResponse as RefineJobStatusSchema,
  SessionResponse as SessionSchema,
  TenantBudgetsView as TenantBudgetsViewSchema,
  TurnAddResponse as TurnAddSchema,
  TurnListResponse as TurnListSchema,
} from "./models.js";

/**
 * Configuration options for the {@link Z3rnoClient}.
 *
 * All fields are optional. When omitted, the client reads from environment
 * variables (`Z3RNO_BASE_URL`, `Z3RNO_API_KEY`) or uses sensible defaults.
 */
export interface Z3rnoClientConfig {
  /**
   * Base URL of the Z3rno API.
   *
   * Falls back to the `Z3RNO_BASE_URL` environment variable, then
   * to `"https://api.z3rno.dev"`.
   */
  baseUrl?: string;

  /**
   * API key for authentication.
   *
   * Falls back to the `Z3RNO_API_KEY` environment variable, then to
   * an empty string (unauthenticated).
   */
  apiKey?: string;

  /**
   * Request timeout in milliseconds.
   *
   * @defaultValue 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Maximum number of retry attempts for retryable errors (5xx, 429,
   * network failures, timeouts).
   *
   * @defaultValue 3
   */
  maxRetries?: number;

  /**
   * Custom fetch implementation.
   *
   * Defaults to `globalThis.fetch`. Override to use `undici`, `node-fetch`,
   * or a test double.
   *
   * @defaultValue globalThis.fetch
   */
  fetch?: typeof globalThis.fetch;

  /**
   * Intercept outgoing requests before they are sent.
   *
   * Use this to add custom headers, log requests, or collect metrics.
   * The callback receives the URL and the `RequestInit` and must return
   * a (possibly modified) `RequestInit`.
   */
  onRequest?: (url: string, init: RequestInit) => RequestInit;

  /**
   * Intercept responses before they are processed.
   *
   * Use this for logging, metrics, or response transformation.
   * The callback receives the `Response` and must return a `Response`.
   */
  onResponse?: (response: Response) => Response;
}

/**
 * Client for the Z3rno AI agent memory API.
 *
 * Uses the standard Fetch API under the hood, making it compatible with
 * Node.js 18+, Deno, Bun, and modern browsers. All responses are
 * validated at runtime with Zod schemas.
 *
 * @example
 * ```ts
 * import { Z3rnoClient } from "@z3rno/sdk";
 *
 * const client = new Z3rnoClient({
 *   baseUrl: "http://localhost:8000",
 *   apiKey: "z3rno_sk_test_...",
 * });
 *
 * // Store a memory
 * const mem = await client.store({
 *   agentId: "550e8400-e29b-41d4-a716-446655440000",
 *   content: "User prefers dark mode",
 * });
 *
 * // Recall relevant memories
 * const results = await client.recall({
 *   agentId: "550e8400-e29b-41d4-a716-446655440000",
 *   query: "user preferences",
 * });
 * ```
 */
export class Z3rnoClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;
  private fetchImpl: typeof globalThis.fetch;
  private onRequest?: (url: string, init: RequestInit) => RequestInit;
  private onResponse?: (response: Response) => Response;

  /**
   * Creates a new Z3rno client instance.
   *
   * @param config - Client configuration options. All fields are optional.
   *
   * @example
   * ```ts
   * // Explicit configuration
   * const client = new Z3rnoClient({
   *   baseUrl: "http://localhost:8000",
   *   apiKey: "z3rno_sk_test_...",
   *   timeout: 10000,
   *   maxRetries: 2,
   * });
   *
   * // Or rely on environment variables (Z3RNO_BASE_URL, Z3RNO_API_KEY)
   * const client = new Z3rnoClient();
   * ```
   */
  constructor(config: Z3rnoClientConfig = {}) {
    // Resolve baseUrl: explicit > env var > default
    let resolvedUrl = config.baseUrl ?? "";
    if (!resolvedUrl && typeof process !== "undefined" && process.env) {
      resolvedUrl = process.env.Z3RNO_BASE_URL ?? "";
    }
    if (!resolvedUrl) {
      resolvedUrl = "https://api.z3rno.dev";
    }
    this.baseUrl = resolvedUrl.replace(/\/$/, "");

    // Resolve apiKey: explicit > env var > empty
    let resolvedKey = config.apiKey ?? "";
    if (!resolvedKey && typeof process !== "undefined" && process.env) {
      resolvedKey = process.env.Z3RNO_API_KEY ?? "";
    }
    this.apiKey = resolvedKey;

    this.timeout = config.timeout ?? 30000;
    this.maxRetries = config.maxRetries ?? 3;
    this.fetchImpl = config.fetch ?? globalThis.fetch;
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;
  }

  // --- Store ---

  /**
   * Stores a new memory for an agent.
   *
   * The server generates an embedding for the content and stores it in
   * the vector database. The memory is immediately available for recall.
   *
   * @param request - The memory to store.
   * @returns The stored memory, including the server-generated ID and scores.
   * @throws {@link AuthenticationError} If the API key is invalid.
   * @throws {@link ValidationError} If the request body is invalid.
   * @throws {@link Z3rnoTimeoutError} If the request times out.
   *
   * @example
   * ```ts
   * const memory = await client.store({
   *   agentId: "550e8400-e29b-41d4-a716-446655440000",
   *   content: "User prefers dark mode",
   *   memoryType: "semantic",
   *   metadata: { source: "settings-page" },
   * });
   * console.log(memory.id); // "mem-abc123"
   * ```
   */
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

  /**
   * Recalls memories by semantic similarity to a query.
   *
   * Returns a ranked list of memories sorted by a combined relevance score
   * that factors in similarity, importance, and recency.
   *
   * @param params - Recall parameters including the query and filters.
   * @param params.agentId - UUID of the agent whose memories to search.
   * @param params.query - Natural-language query for semantic search.
   * @param params.memoryType - Filter by memory type.
   * @param params.filters - Additional metadata filters.
   * @param params.topK - Maximum results to return (default 10).
   * @param params.similarityThreshold - Minimum similarity score (default 0).
   * @returns Ranked recall results with similarity scores.
   * @throws {@link AuthenticationError} If the API key is invalid.
   * @throws {@link Z3rnoTimeoutError} If the request times out.
   *
   * @example
   * ```ts
   * const results = await client.recall({
   *   agentId: "550e8400-e29b-41d4-a716-446655440000",
   *   query: "user preferences",
   *   topK: 5,
   *   similarityThreshold: 0.7,
   * });
   * for (const item of results.results) {
   *   console.log(`${item.content} (score: ${item.relevance_score})`);
   * }
   * ```
   */
  async recall(params: {
    agentId: string;
    query?: string;
    memoryType?: string;
    filters?: Record<string, unknown>;
    topK?: number;
    similarityThreshold?: number;
    /**
     * Phase C: retrieval strategy. One of `AUTO | VECTOR | LEXICAL |
     * GRAPH | TRIPLET | TRACE | TEMPORAL | ASK | CYPHER`. Default
     * `"AUTO"` — server's LLM router picks per query.
     */
    strategy?: string;
    /**
     * Phase C: cross-encoder re-ranking. When `true`, the server
     * re-ranks the strategy's top results. Requires
     * `sentence-transformers` on the server side.
     */
    rerank?: boolean;
    /**
     * Phase G slice 2: scope recall to a single conversation. Older
     * servers ignore the field.
     */
    conversationId?: string;
  }): Promise<RecallResponse> {
    const body: Record<string, unknown> = {
      agent_id: params.agentId,
      query: params.query,
      memory_type: params.memoryType,
      filters: params.filters,
      top_k: params.topK ?? 10,
      similarity_threshold: params.similarityThreshold ?? 0,
      // Always send strategy + rerank. Older servers silently ignore
      // unknown body fields.
      strategy: params.strategy ?? "AUTO",
      rerank: params.rerank ?? false,
    };
    if (params.conversationId) {
      body.conversation_id = params.conversationId;
    }

    const resp = await this.request("POST", "/v1/memories/recall", body);
    return RecallSchema.parse(resp);
  }

  // --- Forget ---

  /**
   * Forgets (deletes) one or more memories.
   *
   * By default, performs a soft delete (marks as deleted but retains data).
   * Set `hardDelete: true` for permanent removal. Use `cascade: true` to
   * also delete related memories in the knowledge graph.
   *
   * @param params - Forget parameters.
   * @param params.agentId - UUID of the agent that owns the memories.
   * @param params.memoryId - UUID of a single memory to delete.
   * @param params.memoryIds - UUIDs of multiple memories to delete.
   * @param params.hardDelete - Permanently delete (default false).
   * @param params.cascade - Delete related memories too (default false).
   * @param params.reason - Reason for deletion (stored in audit log).
   * @returns Summary of the deletion operation.
   * @throws {@link AuthenticationError} If the API key is invalid.
   * @throws {@link NotFoundError} If the specified memory does not exist.
   *
   * @example
   * ```ts
   * const result = await client.forget({
   *   agentId: "550e8400-e29b-41d4-a716-446655440000",
   *   memoryId: "mem-abc123",
   *   hardDelete: true,
   *   reason: "User requested data deletion",
   * });
   * console.log(`Deleted ${result.deleted_count} memories`);
   * ```
   */
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

  // --- Get Memory ---

  /**
   * Retrieves a single memory by its ID.
   *
   * @param memoryId - The unique identifier of the memory to retrieve.
   * @returns The full memory object.
   * @throws {@link NotFoundError} If no memory exists with the given ID.
   * @throws {@link AuthenticationError} If the API key is invalid.
   *
   * @example
   * ```ts
   * const memory = await client.getMemory("mem-abc123");
   * console.log(memory.content);
   * console.log(memory.importance_score);
   * ```
   */
  async getMemory(memoryId: string): Promise<MemoryResponse> {
    const resp = await this.request("GET", `/v1/memories/${memoryId}`);
    return MemorySchema.parse(resp);
  }

  // --- Store Batch ---

  /**
   * Stores multiple memories in a single API call.
   *
   * More efficient than calling {@link store} in a loop. All memories are
   * processed atomically on the server.
   *
   * @param memories - Array of memories to store.
   * @returns The stored memories and a count of how many were created.
   * @throws {@link ValidationError} If any memory in the batch is invalid.
   * @throws {@link AuthenticationError} If the API key is invalid.
   *
   * @example
   * ```ts
   * const result = await client.storeBatch([
   *   { agentId: "agent-1", content: "Fact one" },
   *   { agentId: "agent-1", content: "Fact two", memoryType: "semantic" },
   * ]);
   * console.log(`Stored ${result.stored_count} memories`);
   * ```
   */
  async storeBatch(
    memories: StoreMemoryRequest[],
  ): Promise<BatchStoreResponse> {
    const body = {
      memories: memories.map((m) => ({
        agent_id: m.agentId,
        content: m.content,
        memory_type: m.memoryType,
        metadata: m.metadata,
        importance: m.importance,
      })),
    };

    const resp = await this.request("POST", "/v1/memories/batch", body);
    return BatchStoreSchema.parse(resp);
  }

  // --- Memory History ---

  /**
   * Retrieves the full version history of a memory.
   *
   * Z3rno uses temporal versioning — every update creates a new version
   * rather than overwriting. This method returns all versions ordered
   * chronologically.
   *
   * @param memoryId - The unique identifier of the memory.
   * @returns All versions of the memory with validity timestamps.
   * @throws {@link NotFoundError} If no memory exists with the given ID.
   * @throws {@link AuthenticationError} If the API key is invalid.
   *
   * @example
   * ```ts
   * const history = await client.getMemoryHistory("mem-abc123");
   * for (const version of history.versions) {
   *   console.log(`${version.valid_from}: ${version.content}`);
   * }
   * ```
   */
  async getMemoryHistory(memoryId: string): Promise<MemoryHistoryResponse> {
    const resp = await this.request("GET", `/v1/memories/${memoryId}/history`);
    return MemoryHistorySchema.parse(resp);
  }

  // --- Update Memory ---

  /**
   * Updates an existing memory's content, metadata, or importance.
   *
   * Creates a new temporal version of the memory. The previous version
   * remains accessible via {@link getMemoryHistory}.
   *
   * @param memoryId - The unique identifier of the memory to update.
   * @param updates - Fields to update (only provided fields are changed).
   * @param updates.content - New text content.
   * @param updates.metadata - New metadata (replaces existing metadata).
   * @param updates.importance - New importance score (0-1).
   * @returns The updated memory object.
   * @throws {@link NotFoundError} If no memory exists with the given ID.
   * @throws {@link ValidationError} If the update values are invalid.
   * @throws {@link AuthenticationError} If the API key is invalid.
   *
   * @example
   * ```ts
   * const updated = await client.updateMemory("mem-abc123", {
   *   content: "User now prefers light mode",
   *   importance: 0.9,
   * });
   * ```
   */
  async updateMemory(
    memoryId: string,
    updates: {
      content?: string;
      metadata?: Record<string, unknown>;
      importance?: number;
    },
  ): Promise<MemoryResponse> {
    const body: Record<string, unknown> = {};
    if (updates.content !== undefined) body.content = updates.content;
    if (updates.metadata !== undefined) body.metadata = updates.metadata;
    if (updates.importance !== undefined) body.importance = updates.importance;

    const resp = await this.request("PATCH", `/v1/memories/${memoryId}`, body);
    return MemorySchema.parse(resp);
  }

  // --- Sessions ---

  /**
   * Starts a new session for grouping related memory operations.
   *
   * Sessions are useful for tracking conversation turns or task boundaries.
   * Memories created during a session are automatically associated with it.
   *
   * @param params - Session parameters.
   * @param params.agentId - UUID of the agent to start the session for.
   * @param params.sessionType - Type of session (default `"conversation"`).
   * @returns The created session with its ID and start time.
   * @throws {@link AuthenticationError} If the API key is invalid.
   *
   * @example
   * ```ts
   * const session = await client.startSession({ agentId: "agent-1" });
   * console.log(`Session started: ${session.session_id}`);
   * // ... perform operations ...
   * await client.endSession(session.session_id);
   * ```
   */
  async startSession(params: {
    agentId: string;
    sessionType?: string;
  }): Promise<SessionResponse> {
    const body = {
      agent_id: params.agentId,
      session_type: params.sessionType ?? "conversation",
    };

    const resp = await this.request("POST", "/v1/sessions", body);
    return SessionSchema.parse(resp);
  }

  /**
   * Ends an active session.
   *
   * Returns summary statistics including the session duration and the
   * number of memories created during the session.
   *
   * @param sessionId - The unique identifier of the session to end.
   * @returns Session summary with duration and memory count.
   * @throws {@link NotFoundError} If no active session exists with the given ID.
   * @throws {@link AuthenticationError} If the API key is invalid.
   *
   * @example
   * ```ts
   * const summary = await client.endSession("sess-abc123");
   * console.log(`Session lasted ${summary.duration_seconds}s, ${summary.memory_count} memories`);
   * ```
   */
  async endSession(sessionId: string): Promise<EndSessionResponse> {
    const resp = await this.request("POST", `/v1/sessions/${sessionId}/end`);
    return EndSessionSchema.parse(resp);
  }

  // --- Audit ---

  /**
   * Retrieves a paginated audit log of memory operations.
   *
   * The audit log records every store, recall, forget, and update operation
   * performed by any agent. Useful for compliance, debugging, and analytics.
   *
   * @param params - Optional pagination and filter parameters.
   * @param params.agentId - Filter by agent UUID.
   * @param params.page - Page number (1-indexed).
   * @param params.pageSize - Number of entries per page.
   * @returns A page of audit log entries with pagination metadata.
   * @throws {@link AuthenticationError} If the API key is invalid.
   *
   * @example
   * ```ts
   * const page = await client.audit({ agentId: "agent-1", page: 1, pageSize: 20 });
   * for (const entry of page.entries) {
   *   console.log(`${entry.created_at}: ${entry.operation} on ${entry.memory_id}`);
   * }
   * if (page.has_next) {
   *   const nextPage = await client.audit({ agentId: "agent-1", page: 2 });
   * }
   * ```
   */
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

  // --- Forge: ingest / distill / refine -------------------------------
  //
  // Wrap the server's POST /v1/ingest, /v1/distill, /v1/refine plus the
  // matching GET status endpoints. The server gates each verb behind an
  // operator flag (INGEST_ENABLED / DISTILL_ENABLED / REFINE_ENABLED);
  // when off, these methods throw NotFoundError.

  async ingestText(params: {
    agentId: string;
    text: string;
    datasetId?: string;
  }): Promise<IngestJobResponse> {
    const body: Record<string, unknown> = {
      kind: "text",
      agent_id: params.agentId,
      text: params.text,
    };
    if (params.datasetId) body.dataset_id = params.datasetId;
    const resp = await this.request("POST", "/v1/ingest", body);
    return IngestJobSchema.parse(resp);
  }

  async ingestUrl(params: {
    agentId: string;
    url: string;
    datasetId?: string;
  }): Promise<IngestJobResponse> {
    const body: Record<string, unknown> = {
      kind: "url",
      agent_id: params.agentId,
      url: params.url,
    };
    if (params.datasetId) body.dataset_id = params.datasetId;
    const resp = await this.request("POST", "/v1/ingest", body);
    return IngestJobSchema.parse(resp);
  }

  async getIngestStatus(jobId: string): Promise<IngestJobStatusResponse> {
    const resp = await this.request("GET", `/v1/ingest/${jobId}`);
    return IngestJobStatusSchema.parse(resp);
  }

  async distill(params: {
    agentId: string;
    memoryIds: string[];
    chunkSize?: number;
    chunkOverlap?: number;
    maxConcurrency?: number;
    summaryStyle?: string;
    includeSummary?: boolean;
  }): Promise<DistillJobResponse> {
    const body: Record<string, unknown> = {
      agent_id: params.agentId,
      memory_ids: params.memoryIds,
      include_summary: params.includeSummary ?? true,
    };
    if (params.chunkSize !== undefined) body.chunk_size = params.chunkSize;
    if (params.chunkOverlap !== undefined)
      body.chunk_overlap = params.chunkOverlap;
    if (params.maxConcurrency !== undefined)
      body.max_concurrency = params.maxConcurrency;
    if (params.summaryStyle !== undefined)
      body.summary_style = params.summaryStyle;
    const resp = await this.request("POST", "/v1/distill", body);
    return DistillJobSchema.parse(resp);
  }

  async getDistillStatus(jobId: string): Promise<DistillJobStatusResponse> {
    const resp = await this.request("GET", `/v1/distill/${jobId}`);
    return DistillJobStatusSchema.parse(resp);
  }

  async refine(params?: { datasetId?: string }): Promise<RefineJobResponse> {
    const body: Record<string, unknown> = {};
    if (params?.datasetId) body.dataset_id = params.datasetId;
    const resp = await this.request("POST", "/v1/refine", body);
    return RefineJobSchema.parse(resp);
  }

  async getRefineStatus(jobId: string): Promise<RefineJobStatusResponse> {
    const resp = await this.request("GET", `/v1/refine/${jobId}`);
    return RefineJobStatusSchema.parse(resp);
  }

  // --- Conversations (Phase G slice 2) ---

  /**
   * Open a new conversation. Returns the conversation row including
   * the assigned `id`, which subsequent `recall`s and `addTurn`s
   * reference. The `summaryCadence` controls how often the server
   * flags the conversation for summarization.
   */
  async createConversation(params: {
    agentId: string;
    userId?: string;
    title?: string;
    summaryCadence?: number;
    metadata?: Record<string, unknown>;
  }): Promise<ConversationResponse> {
    const body: Record<string, unknown> = {
      agent_id: params.agentId,
      summary_cadence: params.summaryCadence ?? 10,
    };
    if (params.userId) body.user_id = params.userId;
    if (params.title) body.title = params.title;
    if (params.metadata) body.metadata = params.metadata;
    const resp = await this.request("POST", "/v1/conversations", body);
    return ConversationSchema.parse(resp);
  }

  async getConversation(conversationId: string): Promise<ConversationResponse> {
    const resp = await this.request("GET", `/v1/conversations/${conversationId}`);
    return ConversationSchema.parse(resp);
  }

  /**
   * Stamp an existing Memo as the next turn of the conversation.
   * Returns the assigned `turn_index` plus `needs_summary` — when
   * `true`, the conversation has crossed its cadence threshold.
   */
  async addTurn(
    conversationId: string,
    params: { memoryId: string; turnRole: string },
  ): Promise<TurnAddResponse> {
    const resp = await this.request(
      "POST",
      `/v1/conversations/${conversationId}/turns`,
      { memory_id: params.memoryId, turn_role: params.turnRole },
    );
    return TurnAddSchema.parse(resp);
  }

  /**
   * v0.19.3 — soft-delete a conversation. Existing turn Memos stay
   * queryable through standard recall; the conversation itself stops
   * accepting turns and its endpoints 404. Idempotent.
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.request("DELETE", `/v1/conversations/${conversationId}`);
  }

  async listTurns(
    conversationId: string,
    params?: { afterTurn?: number; limit?: number },
  ): Promise<TurnListResponse> {
    const query = new URLSearchParams();
    if (params?.afterTurn !== undefined)
      query.set("after_turn", String(params.afterTurn));
    query.set("limit", String(params?.limit ?? 50));
    const path = `/v1/conversations/${conversationId}/turns?${query.toString()}`;
    const resp = await this.request("GET", path);
    return TurnListSchema.parse(resp);
  }

  // --- Tenant budgets (v0.20.3) ---

  /**
   * Read this org's stored budget overrides + resolved effective caps.
   * Auth: any admin/write/read member of the calling org.
   */
  async getMyBudgets(): Promise<TenantBudgetsView> {
    const resp = await this.request("GET", "/v1/tenants/me/budgets");
    return TenantBudgetsViewSchema.parse(resp);
  }

  /**
   * Replace this org's budget overrides. Zero / missing fields
   * inherit the server default. Auth: admin/write only.
   */
  async setMyBudgets(
    budgets: Partial<TenantBudgets>,
  ): Promise<TenantBudgetsView> {
    const body: TenantBudgets = {
      daily_tokens: budgets.daily_tokens ?? 0,
      daily_llm_calls: budgets.daily_llm_calls ?? 0,
      daily_embeddings: budgets.daily_embeddings ?? 0,
      monthly_tokens: budgets.monthly_tokens ?? 0,
      monthly_llm_calls: budgets.monthly_llm_calls ?? 0,
      monthly_embeddings: budgets.monthly_embeddings ?? 0,
    };
    const resp = await this.request("PUT", "/v1/tenants/me/budgets", body);
    return TenantBudgetsViewSchema.parse(resp);
  }

  // --- HTTP layer ---

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const url = `${this.baseUrl}${path}`;
        let init: RequestInit = {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": "@z3rno/sdk/0.0.1",
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        };

        if (this.onRequest) {
          init = this.onRequest(url, init);
        }

        let response = await this.fetchImpl(url, init);

        if (this.onResponse) {
          response = this.onResponse(response);
        }

        clearTimeout(timeoutId);

        // On 429, honor Retry-After header and retry
        if (response.status === 429 && attempt < this.maxRetries) {
          const retryAfter = parseInt(
            response.headers.get("Retry-After") ?? "1",
            10,
          );
          await this.sleep(retryAfter * 1000);
          continue;
        }

        // On 5xx, retry with exponential backoff
        if (response.status >= 500 && attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await this.sleep(delay);
          continue;
        }

        return this.handleResponse(response);
      } catch (error) {
        clearTimeout(timeoutId);

        // Do not retry Z3rnoError subclasses (4xx client errors)
        if (error instanceof Z3rnoError) throw error;

        // Classify the error before deciding whether to retry
        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = new Z3rnoTimeoutError(
            `Request timed out after ${this.timeout}ms`,
            this.timeout,
          );
        } else if (error instanceof TypeError) {
          lastError = new Z3rnoConnectionError(
            `Connection failed: ${error.message}`,
          );
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
          continue;
        }
      }
    }

    // After all retries exhausted, throw the last classified error
    if (lastError instanceof Z3rnoError) {
      throw lastError;
    }
    throw new Z3rnoError(
      `Request failed after ${this.maxRetries + 1} attempts: ${String(lastError)}`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async handleResponse(resp: Response): Promise<unknown> {
    if (resp.ok) {
      return resp.json();
    }

    let detail = resp.statusText;
    try {
      const text = await resp.text();
      try {
        const body = JSON.parse(text) as Record<string, unknown>;
        detail = String(body.detail ?? body.error ?? resp.statusText);
      } catch {
        // Response is not JSON (e.g., nginx HTML 502). Include the
        // beginning of the body so users can diagnose proxy/gateway issues.
        if (text.length > 0) {
          const preview = text.length > 200 ? text.slice(0, 200) + "..." : text;
          detail = `${resp.statusText} — ${preview}`;
        }
      }
    } catch {
      // Could not read body at all
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
