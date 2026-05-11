/**
 * Z3rno TypeScript SDK — AI agent memory database client.
 *
 * This is the main entry point for the `@z3rno/sdk` package. It re-exports
 * the {@link Z3rnoClient} class, all error types, and all Zod schemas /
 * TypeScript types used by the API.
 *
 * @packageDocumentation
 *
 * @example
 * ```ts
 * import { Z3rnoClient } from "@z3rno/sdk";
 *
 * const client = new Z3rnoClient({
 *   baseUrl: "http://localhost:8000",
 *   apiKey: "z3rno_sk_..."
 * });
 *
 * const memory = await client.store({
 *   agentId: "agent-1",
 *   content: "User prefers dark mode",
 * });
 * ```
 */

export { Z3rnoClient } from "./client.js";
export type { Z3rnoClientConfig } from "./client.js";
export {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
  Z3rnoConnectionError,
  Z3rnoError,
  Z3rnoTimeoutError,
} from "./errors.js";
export {
  AuditEntry,
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
  MemoryType,
  MemoryVersion,
  RecallResponse,
  RecallResultItem,
  RefineJobResponse,
  RefineJobStatusResponse,
  RelationshipType,
  RetrievalStrategy,
  SessionResponse,
  type StoreMemoryRequest,
  TenantBudgets,
  TenantBudgetsView,
  TurnAddResponse,
  TurnListResponse,
  TurnResponse,
} from "./models.js";

// Framework adapters (Phase G slice 3).
export { Z3rnoVercelMemory } from "./integrations/vercel-ai.js";
export type {
  CoreMessage,
  Z3rnoMessageRole,
  Z3rnoVercelMemoryOptions,
} from "./integrations/vercel-ai.js";
export { Z3rnoMastraMemory } from "./integrations/mastra.js";
export type {
  MastraMessage,
  MastraRole,
  Z3rnoMastraMemoryOptions,
} from "./integrations/mastra.js";
