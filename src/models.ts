/**
 * Zod schemas and inferred TypeScript types for the Z3rno API.
 */

import { z } from "zod";

// --- Enums ---

export const MemoryType = z.enum([
  "working",
  "episodic",
  "semantic",
  "procedural",
]);
export type MemoryType = z.infer<typeof MemoryType>;

export const RelationshipType = z.enum([
  "derived_from",
  "contradicts",
  "supports",
  "supersedes",
  "related_to",
  "caused_by",
]);
export type RelationshipType = z.infer<typeof RelationshipType>;

// --- Request schemas ---

export const StoreMemoryRequest = z.object({
  agentId: z.string().uuid(),
  content: z.string().min(1).max(100000),
  memoryType: MemoryType.default("episodic"),
  userId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).default({}),
  relationships: z
    .array(
      z.object({
        targetMemoryId: z.string().uuid(),
        relationshipType: RelationshipType,
        weight: z.number().min(0).max(1).default(1.0),
        metadata: z.record(z.unknown()).default({}),
      }),
    )
    .default([]),
  ttlSeconds: z.number().int().positive().optional(),
  importance: z.number().min(0).max(1).optional(),
});
export type StoreMemoryRequest = z.infer<typeof StoreMemoryRequest>;

export const RecallRequest = z.object({
  agentId: z.string().uuid(),
  query: z.string().optional(),
  memoryType: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  topK: z.number().int().min(1).max(100).default(10),
  similarityThreshold: z.number().min(0).max(1).default(0),
  asOf: z.string().datetime().optional(),
  includeDeleted: z.boolean().default(false),
});
export type RecallRequest = z.infer<typeof RecallRequest>;

export const ForgetRequest = z.object({
  agentId: z.string().uuid(),
  memoryId: z.string().uuid().optional(),
  memoryIds: z.array(z.string().uuid()).optional(),
  hardDelete: z.boolean().default(false),
  cascade: z.boolean().default(false),
  reason: z.string().optional(),
});
export type ForgetRequest = z.infer<typeof ForgetRequest>;

// --- Response schemas ---

export const MemoryResponse = z.object({
  id: z.string(),
  agent_id: z.string(),
  content: z.string(),
  memory_type: z.string(),
  importance_score: z.number(),
  recall_count: z.number(),
  embedding_model: z.string().nullable().optional(),
  created_at: z.string(),
  metadata: z.record(z.unknown()).default({}),
});
export type MemoryResponse = z.infer<typeof MemoryResponse>;

export const RecallResultItem = z.object({
  memory_id: z.string(),
  content: z.string(),
  summary: z.string().nullable().optional(),
  memory_type: z.string(),
  similarity_score: z.number(),
  importance_score: z.number(),
  relevance_score: z.number(),
  recall_count: z.number(),
  created_at: z.string(),
  metadata: z.record(z.unknown()).default({}),
});
export type RecallResultItem = z.infer<typeof RecallResultItem>;

export const RecallResponse = z.object({
  results: z.array(RecallResultItem),
  total: z.number(),
  query: z.string().nullable().optional(),
});
export type RecallResponse = z.infer<typeof RecallResponse>;

export const ForgetResponse = z.object({
  deleted_count: z.number(),
  hard_deleted: z.boolean(),
  cascade_count: z.number(),
  memory_ids: z.array(z.string()),
});
export type ForgetResponse = z.infer<typeof ForgetResponse>;

export const AuditEntry = z.object({
  id: z.number(),
  agent_id: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
  operation: z.string(),
  memory_id: z.string().nullable().optional(),
  memory_type: z.string().nullable().optional(),
  details: z.record(z.unknown()).default({}),
  ip_address: z.string().nullable().optional(),
  created_at: z.string(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;

export const AuditPageResponse = z.object({
  entries: z.array(AuditEntry),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  has_next: z.boolean(),
});
export type AuditPageResponse = z.infer<typeof AuditPageResponse>;
