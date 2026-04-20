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
  EndSessionResponse,
  ForgetResponse,
  MemoryHistoryResponse,
  MemoryResponse,
  MemoryType,
  MemoryVersion,
  RecallResponse,
  RecallResultItem,
  RelationshipType,
  SessionResponse,
  type StoreMemoryRequest,
} from "./models.js";
