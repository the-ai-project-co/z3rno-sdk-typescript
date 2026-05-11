/**
 * Zod schemas and inferred TypeScript types for the Z3rno API.
 *
 * Each export is a dual: a Zod schema (used for runtime validation) and an
 * identically-named TypeScript type (used at compile time). Request schemas
 * validate client-side input; response schemas validate server payloads.
 *
 * @module models
 */

import { z } from "zod";

// --- Enums ---

/**
 * Memory type enum.
 *
 * Controls how a memory is stored, indexed, and decayed.
 *
 * - `working` — Short-lived scratchpad memory (high decay rate).
 * - `episodic` — Event-based memory tied to a specific interaction.
 * - `semantic` — Long-term factual knowledge.
 * - `procedural` — How-to or process knowledge.
 */
export const MemoryType = z.enum([
  "working",
  "episodic",
  "semantic",
  "procedural",
]);

/** Memory type: `"working"` | `"episodic"` | `"semantic"` | `"procedural"`. */
export type MemoryType = z.infer<typeof MemoryType>;

/**
 * Relationship type enum.
 *
 * Describes how two memories are related in the knowledge graph.
 *
 * - `derived_from` — This memory was created from another.
 * - `contradicts` — This memory conflicts with another.
 * - `supports` — This memory reinforces another.
 * - `supersedes` — This memory replaces another.
 * - `related_to` — General association.
 * - `caused_by` — Causal relationship.
 */
export const RelationshipType = z.enum([
  "derived_from",
  "contradicts",
  "supports",
  "supersedes",
  "related_to",
  "caused_by",
]);

/** Relationship type between two memories. */
export type RelationshipType = z.infer<typeof RelationshipType>;

/**
 * Retrieval strategy for `recall({ strategy: ... })` — Phase C.
 *
 * `AUTO` is the default; the server's LLM router picks one of the
 * others when configured. Use an explicit value to bypass routing.
 */
export const RetrievalStrategy = z.enum([
  "AUTO",
  "VECTOR",
  "LEXICAL",
  "GRAPH",
  "TRIPLET",
  "TRACE",
  "TEMPORAL",
  "ASK",
  "CYPHER",
]);

/** Retrieval strategy enum (canonical UPPERCASE names). */
export type RetrievalStrategy = z.infer<typeof RetrievalStrategy>;

// --- Request schemas ---

/**
 * Schema for storing a new memory.
 *
 * @example
 * ```ts
 * const request = StoreMemoryRequest.parse({
 *   agentId: "550e8400-e29b-41d4-a716-446655440000",
 *   content: "User prefers dark mode",
 *   memoryType: "semantic",
 * });
 * ```
 */
export const StoreMemoryRequest = z.object({
  /** UUID of the agent that owns this memory. */
  agentId: z.string().uuid(),
  /** The text content to store (1 to 100,000 characters). */
  content: z.string().min(1).max(100000),
  /** Category of memory. Defaults to `"episodic"`. */
  memoryType: MemoryType.default("episodic"),
  /** Optional UUID of the user associated with this memory. */
  userId: z.string().uuid().optional(),
  /** Arbitrary key-value metadata attached to the memory. */
  metadata: z.record(z.unknown()).default({}),
  /** Relationships to other memories in the knowledge graph. */
  relationships: z
    .array(
      z.object({
        /** UUID of the target memory. */
        targetMemoryId: z.string().uuid(),
        /** Type of relationship to the target memory. */
        relationshipType: RelationshipType,
        /** Relationship strength from 0 to 1. Defaults to 1.0. */
        weight: z.number().min(0).max(1).default(1.0),
        /** Arbitrary metadata for the relationship edge. */
        metadata: z.record(z.unknown()).default({}),
      }),
    )
    .default([]),
  /** Time-to-live in seconds. Memory auto-deletes after this duration. */
  ttlSeconds: z.number().int().positive().optional(),
  /** Importance score from 0 to 1. Influences recall ranking. */
  importance: z.number().min(0).max(1).optional(),
});

/** Parsed type for a store-memory request. */
export type StoreMemoryRequest = z.infer<typeof StoreMemoryRequest>;

/**
 * Schema for recalling memories by semantic similarity.
 *
 * @example
 * ```ts
 * const request = RecallRequest.parse({
 *   agentId: "550e8400-e29b-41d4-a716-446655440000",
 *   query: "user preferences",
 *   topK: 5,
 * });
 * ```
 */
export const RecallRequest = z.object({
  /** UUID of the agent whose memories to search. */
  agentId: z.string().uuid(),
  /** Natural-language query for semantic similarity search. */
  query: z.string().optional(),
  /** Filter results to a specific memory type. */
  memoryType: z.string().optional(),
  /** Additional metadata filters. */
  filters: z.record(z.unknown()).optional(),
  /** Maximum number of results to return (1-100, default 10). */
  topK: z.number().int().min(1).max(100).default(10),
  /** Minimum similarity score threshold (0-1, default 0). */
  similarityThreshold: z.number().min(0).max(1).default(0),
  /** ISO 8601 timestamp for temporal queries (point-in-time recall). */
  asOf: z.string().datetime().optional(),
  /** Whether to include soft-deleted memories. */
  includeDeleted: z.boolean().default(false),
  /**
   * Phase C retrieval strategy. `AUTO` (default) lets the server's
   * LLM router pick the best fit. See {@link RetrievalStrategy}.
   */
  strategy: RetrievalStrategy.default("AUTO"),
  /**
   * Phase C cross-encoder re-ranking. When `true`, the server
   * re-ranks the top results via a cross-encoder. Requires the
   * `sentence-transformers` extra on the server.
   */
  rerank: z.boolean().default(false),
});

/** Parsed type for a recall request. */
export type RecallRequest = z.infer<typeof RecallRequest>;

/**
 * Schema for forgetting (deleting) memories.
 *
 * @example
 * ```ts
 * const request = ForgetRequest.parse({
 *   agentId: "550e8400-e29b-41d4-a716-446655440000",
 *   memoryId: "mem-123",
 *   hardDelete: true,
 * });
 * ```
 */
export const ForgetRequest = z.object({
  /** UUID of the agent that owns the memories. */
  agentId: z.string().uuid(),
  /** UUID of a single memory to delete. */
  memoryId: z.string().uuid().optional(),
  /** UUIDs of multiple memories to delete in one call. */
  memoryIds: z.array(z.string().uuid()).optional(),
  /** If true, permanently deletes (vs. soft-delete). Defaults to false. */
  hardDelete: z.boolean().default(false),
  /** If true, also deletes related memories. Defaults to false. */
  cascade: z.boolean().default(false),
  /** Optional reason for the deletion (stored in audit log). */
  reason: z.string().optional(),
});

/** Parsed type for a forget request. */
export type ForgetRequest = z.infer<typeof ForgetRequest>;

// --- Response schemas ---

/**
 * Schema for a single memory object returned by the API.
 *
 * Used by {@link Z3rnoClient.store}, {@link Z3rnoClient.getMemory}, and
 * {@link Z3rnoClient.updateMemory}.
 */
export const MemoryResponse = z.object({
  /** Unique identifier for this memory. */
  id: z.string(),
  /** UUID of the owning agent. */
  agent_id: z.string(),
  /** Text content of the memory. */
  content: z.string(),
  /** Category of the memory. */
  memory_type: z.string(),
  /** Server-computed importance score (0-1). */
  importance_score: z.number(),
  /** Number of times this memory has been recalled. */
  recall_count: z.number(),
  /** Name of the embedding model used, if any. */
  embedding_model: z.string().nullable().optional(),
  /** ISO 8601 creation timestamp. */
  created_at: z.string(),
  /** Arbitrary metadata attached to the memory. */
  metadata: z.record(z.unknown()).default({}),
});

/** Parsed type for a memory response. */
export type MemoryResponse = z.infer<typeof MemoryResponse>;

/**
 * Schema for a single item in recall results.
 *
 * Each item includes similarity, importance, and relevance scores
 * computed by the server's ranking algorithm.
 */
export const RecallResultItem = z.object({
  /** Unique identifier of the recalled memory. */
  memory_id: z.string(),
  /** Text content of the memory. */
  content: z.string(),
  /** Optional server-generated summary. */
  summary: z.string().nullable().optional(),
  /** Category of the memory. */
  memory_type: z.string(),
  /** Cosine similarity to the query (0-1). */
  similarity_score: z.number(),
  /** Server-computed importance score (0-1). */
  importance_score: z.number(),
  /** Combined relevance score used for ranking (0-1). */
  relevance_score: z.number(),
  /** Number of times this memory has been recalled. */
  recall_count: z.number(),
  /** ISO 8601 creation timestamp. */
  created_at: z.string(),
  /** Arbitrary metadata attached to the memory. */
  metadata: z.record(z.unknown()).default({}),
  /**
   * Phase C per-source signals — e.g. `{ vector: 0.83, lexical: 0.61 }`.
   * Optional so older servers (v0.7.x) keep parsing.
   */
  score_components: z.record(z.number()).default({}),
});

/** Parsed type for a single recall result item. */
export type RecallResultItem = z.infer<typeof RecallResultItem>;

/**
 * Schema for the full recall response.
 *
 * Contains an array of ranked results and the total count of matches.
 */
export const RecallResponse = z.object({
  /** Ranked list of matching memories. */
  results: z.array(RecallResultItem),
  /** Total number of matches (may exceed `topK`). */
  total: z.number(),
  /** The query that was searched, if any. */
  query: z.string().nullable().optional(),
  /** Phase C: strategy that actually ran (after AUTO routing + re-rank). */
  strategy_used: z.string().default("VECTOR"),
  /** Phase C: AUTO's candidate list (e.g. `["AUTO->GRAPH"]`). */
  strategies_considered: z.array(z.string()).default([]),
  /** Phase C: whether the cross-encoder re-rank ran. */
  reranked: z.boolean().default(false),
  /** Phase C: end-to-end recall latency on the server (ms). */
  elapsed_ms: z.number().default(0),
});

/** Parsed type for a recall response. */
export type RecallResponse = z.infer<typeof RecallResponse>;

/**
 * Schema for the forget (delete) response.
 *
 * Reports how many memories were deleted and whether cascade was applied.
 */
export const ForgetResponse = z.object({
  /** Number of memories deleted. */
  deleted_count: z.number(),
  /** Whether a hard delete was performed. */
  hard_deleted: z.boolean(),
  /** Number of related memories deleted via cascade. */
  cascade_count: z.number(),
  /** IDs of all deleted memories. */
  memory_ids: z.array(z.string()),
});

/** Parsed type for a forget response. */
export type ForgetResponse = z.infer<typeof ForgetResponse>;

/**
 * Schema for a single audit log entry.
 *
 * Audit entries record every operation performed on the agent's memories.
 */
export const AuditEntry = z.object({
  /** Auto-incrementing audit entry ID. */
  id: z.number(),
  /** UUID of the agent, if applicable. */
  agent_id: z.string().nullable().optional(),
  /** UUID of the user, if applicable. */
  user_id: z.string().nullable().optional(),
  /** Operation type (e.g., `"store"`, `"recall"`, `"forget"`). */
  operation: z.string(),
  /** UUID of the affected memory, if applicable. */
  memory_id: z.string().nullable().optional(),
  /** Memory type of the affected memory, if applicable. */
  memory_type: z.string().nullable().optional(),
  /** Additional details about the operation. */
  details: z.record(z.unknown()).default({}),
  /** IP address of the caller, if available. */
  ip_address: z.string().nullable().optional(),
  /** ISO 8601 timestamp of the operation. */
  created_at: z.string(),
});

/** Parsed type for an audit entry. */
export type AuditEntry = z.infer<typeof AuditEntry>;

/**
 * Schema for a paginated audit log response.
 *
 * Supports cursor-based pagination via `page` and `page_size`.
 */
export const AuditPageResponse = z.object({
  /** Audit entries on this page. */
  entries: z.array(AuditEntry),
  /** Total number of matching audit entries. */
  total: z.number(),
  /** Current page number (1-indexed). */
  page: z.number(),
  /** Number of entries per page. */
  page_size: z.number(),
  /** Whether more pages are available. */
  has_next: z.boolean(),
});

/** Parsed type for a paginated audit response. */
export type AuditPageResponse = z.infer<typeof AuditPageResponse>;

// --- Batch Store ---

/**
 * Schema for the batch store response.
 *
 * Returned by {@link Z3rnoClient.storeBatch} after storing multiple memories.
 */
export const BatchStoreResponse = z.object({
  /** Array of stored memory objects. */
  results: z.array(MemoryResponse),
  /** Number of memories successfully stored. */
  stored_count: z.number(),
});

/** Parsed type for a batch store response. */
export type BatchStoreResponse = z.infer<typeof BatchStoreResponse>;

// --- Memory History ---

/**
 * Schema for a single version of a memory (temporal versioning).
 *
 * Each version represents the state of a memory during a specific time range.
 */
export const MemoryVersion = z.object({
  /** Version identifier. */
  id: z.string(),
  /** Text content at this version. */
  content: z.string(),
  /** Memory type at this version. */
  memory_type: z.string(),
  /** Importance score at this version. */
  importance_score: z.number(),
  /** ISO 8601 timestamp when this version became active. */
  valid_from: z.string(),
  /** ISO 8601 timestamp when this version was superseded, or null if current. */
  valid_to: z.string().nullable().optional(),
  /** Metadata at this version. */
  metadata: z.record(z.unknown()).default({}),
});

/** Parsed type for a memory version. */
export type MemoryVersion = z.infer<typeof MemoryVersion>;

/**
 * Schema for the memory history response.
 *
 * Contains all temporal versions of a single memory, ordered chronologically.
 */
export const MemoryHistoryResponse = z.object({
  /** UUID of the memory. */
  memory_id: z.string(),
  /** Chronologically ordered list of versions. */
  versions: z.array(MemoryVersion),
  /** Total number of versions. */
  total: z.number(),
});

/** Parsed type for a memory history response. */
export type MemoryHistoryResponse = z.infer<typeof MemoryHistoryResponse>;

// --- Sessions ---

/**
 * Schema for a session response.
 *
 * Sessions group related memory operations (e.g., a conversation turn).
 */
export const SessionResponse = z.object({
  /** Unique session identifier. */
  session_id: z.string(),
  /** UUID of the agent this session belongs to. */
  agent_id: z.string(),
  /** Type of session (e.g., `"conversation"`). */
  session_type: z.string(),
  /** ISO 8601 timestamp when the session started. */
  started_at: z.string(),
  /** Arbitrary session metadata. */
  metadata: z.record(z.unknown()).default({}),
});

/** Parsed type for a session response. */
export type SessionResponse = z.infer<typeof SessionResponse>;

/**
 * Schema for the end-session response.
 *
 * Returned when a session is closed, including summary statistics.
 */
export const EndSessionResponse = z.object({
  /** The session that was ended. */
  session_id: z.string(),
  /** ISO 8601 timestamp when the session ended. */
  ended_at: z.string(),
  /** Total duration of the session in seconds. */
  duration_seconds: z.number(),
  /** Number of memories created during the session. */
  memory_count: z.number(),
});

/** Parsed type for an end-session response. */
export type EndSessionResponse = z.infer<typeof EndSessionResponse>;

// ---------------------------------------------------------------------------
// Forge verbs — ingest / distill / refine (Phase A / B / D)
// ---------------------------------------------------------------------------

/** Response to POST /v1/ingest — the enqueue ack. */
export const IngestJobResponse = z.object({
  job_id: z.string(),
  kind: z.string(),
  status: z.string(),
  dataset_id: z.string().nullable().optional(),
  enqueued_at: z.string(),
});

export type IngestJobResponse = z.infer<typeof IngestJobResponse>;

/** Full state from GET /v1/ingest/{job_id}. */
export const IngestJobStatusResponse = z.object({
  job_id: z.string(),
  agent_id: z.string(),
  dataset_id: z.string().nullable().optional(),
  kind: z.string(),
  status: z.string(),
  source_uri: z.string().nullable().optional(),
  content_type: z.string().nullable().optional(),
  filename: z.string().nullable().optional(),
  file_size: z.number().nullable().optional(),
  memory_ids: z.array(z.string()).default([]),
  memos_written: z.number().default(0),
  distill_job_id: z.string().nullable().optional(),
  codegraph_memos_written: z.number().default(0),
  codegraph_edges_written: z.number().default(0),
  error: z.string().nullable().optional(),
  warnings: z.array(z.record(z.unknown())).default([]),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type IngestJobStatusResponse = z.infer<typeof IngestJobStatusResponse>;

/** Distill enqueue ack. */
export const DistillJobResponse = z.object({
  job_id: z.string(),
  status: z.string(),
  memory_ids: z.array(z.string()),
  enqueued_at: z.string(),
});

export type DistillJobResponse = z.infer<typeof DistillJobResponse>;

/** Full distill job state. */
export const DistillJobStatusResponse = z.object({
  job_id: z.string(),
  agent_id: z.string(),
  status: z.string(),
  model: z.string(),
  memory_ids: z.array(z.string()),
  chunk_size: z.number(),
  chunk_overlap: z.number(),
  max_concurrency: z.number(),
  chunks_total: z.number(),
  chunks_failed: z.number(),
  entities_extracted: z.number(),
  relationships_extracted: z.number(),
  memos_written: z.number(),
  error: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type DistillJobStatusResponse = z.infer<typeof DistillJobStatusResponse>;

/** Refine enqueue ack. */
export const RefineJobResponse = z.object({
  job_id: z.string(),
  status: z.string(),
  dataset_id: z.string().nullable().optional(),
  enqueued_at: z.string(),
});

export type RefineJobResponse = z.infer<typeof RefineJobResponse>;

/** Full refine job state. */
export const RefineJobStatusResponse = z.object({
  job_id: z.string(),
  status: z.string(),
  dataset_id: z.string().nullable().optional(),
  trigger: z.string(),
  memos_scanned: z.number().default(0),
  memos_deduped: z.number().default(0),
  edges_reweighted: z.number().default(0),
  edges_pruned: z.number().default(0),
  feedback_drained: z.number().default(0),
  job_metadata: z.record(z.unknown()).default({}),
  error: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type RefineJobStatusResponse = z.infer<typeof RefineJobStatusResponse>;


// ---------------------------------------------------------------------------
// Conversations — Phase G slice 2
// ---------------------------------------------------------------------------

/** Conversation metadata. */
export const ConversationResponse = z.object({
  id: z.string(),
  agent_id: z.string(),
  user_id: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  summary_cadence: z.number(),
  turn_count: z.number(),
  last_summary_turn: z.number(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ConversationResponse = z.infer<typeof ConversationResponse>;

/** Result of POST /v1/conversations/{id}/turns. */
export const TurnAddResponse = z.object({
  turn_index: z.number(),
  needs_summary: z.boolean(),
});

export type TurnAddResponse = z.infer<typeof TurnAddResponse>;

/** One turn within a conversation. */
export const TurnResponse = z.object({
  memory_id: z.string(),
  turn_index: z.number(),
  turn_role: z.string(),
  content: z.string(),
  created_at: z.string(),
});

export type TurnResponse = z.infer<typeof TurnResponse>;

/** Paginated turn list. */
export const TurnListResponse = z.object({
  turns: z.array(TurnResponse),
  total: z.number(),
  conversation_id: z.string(),
});

export type TurnListResponse = z.infer<typeof TurnListResponse>;


// ---------------------------------------------------------------------------
// Tenant budgets — v0.20.3
// ---------------------------------------------------------------------------

/** Per-tenant budget caps. Zero means inherit server default. */
export const TenantBudgets = z.object({
  daily_tokens: z.number(),
  daily_llm_calls: z.number(),
  daily_embeddings: z.number(),
  monthly_tokens: z.number(),
  monthly_llm_calls: z.number(),
  monthly_embeddings: z.number(),
});

export type TenantBudgets = z.infer<typeof TenantBudgets>;

/** Server response: stored overrides + resolved effective caps. */
export const TenantBudgetsView = z.object({
  overrides: TenantBudgets,
  effective: TenantBudgets,
});

export type TenantBudgetsView = z.infer<typeof TenantBudgetsView>;
