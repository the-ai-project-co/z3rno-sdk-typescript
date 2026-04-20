/**
 * Z3rno SDK error hierarchy.
 *
 * All errors thrown by the SDK extend {@link Z3rnoError}, which itself extends
 * the built-in `Error` class. This lets callers catch broadly (`Z3rnoError`)
 * or narrowly (`AuthenticationError`, `RateLimitError`, etc.).
 *
 * @module errors
 */

/**
 * Base error class for all Z3rno SDK errors.
 *
 * Every error produced by the SDK is an instance of this class, so you can
 * use a single `catch (e) { if (e instanceof Z3rnoError) ... }` guard to
 * handle them all.
 *
 * @example
 * ```ts
 * try {
 *   await client.store({ agentId: "...", content: "..." });
 * } catch (e) {
 *   if (e instanceof Z3rnoError) {
 *     console.error(`Z3rno error (${e.statusCode}): ${e.message}`);
 *   }
 * }
 * ```
 */
export class Z3rnoError extends Error {
  /** HTTP status code returned by the server, if applicable. */
  statusCode?: number;

  /**
   * @param message - Human-readable description of the error.
   * @param statusCode - HTTP status code associated with the error, if any.
   */
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "Z3rnoError";
    this.statusCode = statusCode;
  }
}

/**
 * Thrown when the API key is missing, invalid, or revoked (HTTP 401).
 *
 * @example
 * ```ts
 * try {
 *   await client.store({ agentId: "...", content: "..." });
 * } catch (e) {
 *   if (e instanceof AuthenticationError) {
 *     console.error("Check your API key");
 *   }
 * }
 * ```
 */
export class AuthenticationError extends Z3rnoError {
  /**
   * @param message - Description of the authentication failure.
   */
  constructor(message: string) {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Thrown when the client exceeds the API rate limit (HTTP 429).
 *
 * The {@link retryAfter} property indicates how many seconds to wait
 * before retrying, as reported by the server's `Retry-After` header.
 *
 * @example
 * ```ts
 * try {
 *   await client.recall({ agentId: "...", query: "..." });
 * } catch (e) {
 *   if (e instanceof RateLimitError) {
 *     console.log(`Retry after ${e.retryAfter} seconds`);
 *   }
 * }
 * ```
 */
export class RateLimitError extends Z3rnoError {
  /** Number of seconds to wait before retrying, per the Retry-After header. */
  retryAfter: number;

  /**
   * @param message - Description of the rate-limit error.
   * @param retryAfter - Seconds to wait before retrying (defaults to 60).
   */
  constructor(message: string, retryAfter: number = 60) {
    super(message, 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown when the server rejects the request due to invalid input (HTTP 400 or 422).
 *
 * @example
 * ```ts
 * try {
 *   await client.store({ agentId: "not-a-uuid", content: "" });
 * } catch (e) {
 *   if (e instanceof ValidationError) {
 *     console.error(`Validation failed: ${e.message}`);
 *   }
 * }
 * ```
 */
export class ValidationError extends Z3rnoError {
  /**
   * @param message - Description of the validation failure.
   * @param statusCode - HTTP status code (400 or 422, defaults to 400).
   */
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode);
    this.name = "ValidationError";
  }
}

/**
 * Thrown when the requested resource does not exist (HTTP 404).
 *
 * @example
 * ```ts
 * try {
 *   await client.getMemory("non-existent-id");
 * } catch (e) {
 *   if (e instanceof NotFoundError) {
 *     console.error("Memory not found");
 *   }
 * }
 * ```
 */
export class NotFoundError extends Z3rnoError {
  /**
   * @param message - Description of what was not found.
   */
  constructor(message: string) {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when the Z3rno API returns a server-side error (HTTP 5xx).
 *
 * The SDK automatically retries on 5xx errors with exponential backoff.
 * This error is only thrown after all retries are exhausted.
 *
 * @example
 * ```ts
 * try {
 *   await client.store({ agentId: "...", content: "..." });
 * } catch (e) {
 *   if (e instanceof ServerError) {
 *     console.error(`Server error (${e.statusCode}): ${e.message}`);
 *   }
 * }
 * ```
 */
export class ServerError extends Z3rnoError {
  /**
   * @param message - Description of the server error.
   * @param statusCode - HTTP status code (defaults to 500).
   */
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode);
    this.name = "ServerError";
  }
}

/**
 * Thrown when a request exceeds the configured timeout duration.
 *
 * The SDK uses an {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController | AbortController}
 * to enforce timeouts. This error is thrown after all retries are exhausted.
 *
 * @example
 * ```ts
 * const client = new Z3rnoClient({ timeout: 5000 }); // 5 seconds
 * try {
 *   await client.recall({ agentId: "...", query: "..." });
 * } catch (e) {
 *   if (e instanceof Z3rnoTimeoutError) {
 *     console.error(`Timed out after ${e.timeout}ms`);
 *   }
 * }
 * ```
 */
export class Z3rnoTimeoutError extends Z3rnoError {
  /** The timeout duration in milliseconds that was exceeded. */
  timeout: number;

  /**
   * @param message - Description of the timeout.
   * @param timeout - The configured timeout value in milliseconds.
   */
  constructor(message: string, timeout: number) {
    super(message, undefined);
    this.name = "Z3rnoTimeoutError";
    this.timeout = timeout;
  }
}

/**
 * Thrown when the SDK cannot establish a connection to the Z3rno API.
 *
 * This typically indicates a network issue, DNS failure, or the server
 * being unreachable. The SDK retries connection errors with exponential
 * backoff before throwing this error.
 *
 * @example
 * ```ts
 * try {
 *   await client.store({ agentId: "...", content: "..." });
 * } catch (e) {
 *   if (e instanceof Z3rnoConnectionError) {
 *     console.error("Cannot reach Z3rno API — check your network");
 *   }
 * }
 * ```
 */
export class Z3rnoConnectionError extends Z3rnoError {
  /**
   * @param message - Description of the connection failure.
   */
  constructor(message: string) {
    super(message, undefined);
    this.name = "Z3rnoConnectionError";
  }
}
