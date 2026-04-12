/**
 * Z3rno SDK error hierarchy.
 */

export class Z3rnoError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "Z3rnoError";
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends Z3rnoError {
  constructor(message: string) {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends Z3rnoError {
  retryAfter: number;

  constructor(message: string, retryAfter: number = 60) {
    super(message, 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class ValidationError extends Z3rnoError {
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Z3rnoError {
  constructor(message: string) {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ServerError extends Z3rnoError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode);
    this.name = "ServerError";
  }
}
