/**
 * Z3rno TypeScript SDK — AI agent memory database client.
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
  Z3rnoError,
} from "./errors.js";
export {
  AuditEntry,
  AuditPageResponse,
  ForgetResponse,
  MemoryResponse,
  MemoryType,
  RecallResponse,
  RecallResultItem,
  RelationshipType,
  type StoreMemoryRequest,
} from "./models.js";
