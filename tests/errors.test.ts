import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
  Z3rnoError,
} from "../src/errors.js";

describe("Z3rnoError", () => {
  it("has message and optional statusCode", () => {
    const err = new Z3rnoError("test");
    expect(err.message).toBe("test");
    expect(err.statusCode).toBeUndefined();
  });

  it("accepts statusCode", () => {
    const err = new Z3rnoError("test", 500);
    expect(err.statusCode).toBe(500);
  });

  it("is an instance of Error", () => {
    const err = new Z3rnoError("test");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("AuthenticationError", () => {
  it("has statusCode 401", () => {
    const err = new AuthenticationError("bad key");
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("AuthenticationError");
    expect(err).toBeInstanceOf(Z3rnoError);
  });
});

describe("RateLimitError", () => {
  it("has statusCode 429 and retryAfter", () => {
    const err = new RateLimitError("too fast", 30);
    expect(err.statusCode).toBe(429);
    expect(err.retryAfter).toBe(30);
  });

  it("defaults retryAfter to 60", () => {
    const err = new RateLimitError("too fast");
    expect(err.retryAfter).toBe(60);
  });
});

describe("ValidationError", () => {
  it("has configurable statusCode", () => {
    const err = new ValidationError("bad input", 422);
    expect(err.statusCode).toBe(422);
    expect(err).toBeInstanceOf(Z3rnoError);
  });
});

describe("NotFoundError", () => {
  it("has statusCode 404", () => {
    const err = new NotFoundError("missing");
    expect(err.statusCode).toBe(404);
  });
});

describe("ServerError", () => {
  it("has configurable statusCode", () => {
    const err = new ServerError("boom", 503);
    expect(err.statusCode).toBe(503);
  });

  it("defaults to 500", () => {
    const err = new ServerError("boom");
    expect(err.statusCode).toBe(500);
  });
});

describe("inheritance", () => {
  it("all errors extend Z3rnoError", () => {
    expect(new AuthenticationError("")).toBeInstanceOf(Z3rnoError);
    expect(new RateLimitError("")).toBeInstanceOf(Z3rnoError);
    expect(new ValidationError("")).toBeInstanceOf(Z3rnoError);
    expect(new NotFoundError("")).toBeInstanceOf(Z3rnoError);
    expect(new ServerError("")).toBeInstanceOf(Z3rnoError);
  });
});
