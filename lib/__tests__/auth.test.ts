import { beforeAll, describe, expect, it } from "vitest";
import {
  hashPassphrase,
  newEventId,
  signAccessToken,
  verifyAccessToken,
  verifyPassphrase,
} from "../auth";

beforeAll(() => {
  process.env.APP_SECRET = "test-secret";
});

describe("newEventId", () => {
  it("is URL-safe and unguessable", () => {
    const id = newEventId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(new Set(Array.from({ length: 100 }, newEventId)).size).toBe(100);
  });
});

describe("passphrases", () => {
  it("accepts the right one and rejects the rest", () => {
    const stored = hashPassphrase("correct horse");
    expect(verifyPassphrase("correct horse", stored)).toBe(true);
    expect(verifyPassphrase("Correct horse", stored)).toBe(false);
    expect(verifyPassphrase("", stored)).toBe(false);
  });

  it("salts, so the same passphrase hashes differently each time", () => {
    expect(hashPassphrase("same").hash).not.toBe(hashPassphrase("same").hash);
  });
});

describe("access tokens", () => {
  it("round-trips for the event it was issued for", () => {
    const token = signAccessToken("event-a");
    expect(verifyAccessToken("event-a", token)).toBe(true);
  });

  it("does not carry over to another event", () => {
    expect(verifyAccessToken("event-b", signAccessToken("event-a"))).toBe(false);
  });

  it("rejects expired, tampered, and missing tokens", () => {
    expect(verifyAccessToken("event-a", signAccessToken("event-a", -1000))).toBe(false);
    expect(verifyAccessToken("event-a", `${Date.now() + 10_000}.deadbeef`)).toBe(false);
    expect(verifyAccessToken("event-a", undefined)).toBe(false);
    expect(verifyAccessToken("event-a", "garbage")).toBe(false);
  });
});
