import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const SCRYPT_KEYLEN = 64;

/** 128 bits of randomness, URL-safe. This is the only thing guarding an event. */
export function newEventId(): string {
  return randomBytes(16).toString("base64url");
}

export function hashPassphrase(passphrase: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(passphrase, salt, SCRYPT_KEYLEN).toString("hex");
  return { salt, hash };
}

export function verifyPassphrase(
  passphrase: string,
  stored: { salt: string; hash: string },
): boolean {
  const expected = Buffer.from(stored.hash, "hex");
  const actual = scryptSync(passphrase, stored.salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function secret(): string {
  const value = process.env.APP_SECRET;
  if (!value) {
    throw new Error("APP_SECRET is not set; cannot sign access tokens");
  }
  return value;
}

/**
 * Access token for one event: `<expiry>.<hmac>`. Scoped to the event id so a
 * token for one event proves nothing about another. No passphrase material
 * goes into the cookie.
 */
export function signAccessToken(eventId: string, ttlMs = 30 * 24 * 60 * 60 * 1000): string {
  const expires = Date.now() + ttlMs;
  return `${expires}.${mac(eventId, expires)}`;
}

export function verifyAccessToken(eventId: string, token: string | undefined): boolean {
  if (!token) return false;
  const [expiresRaw, signature] = token.split(".");
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now() || !signature) return false;

  const expected = Buffer.from(mac(eventId, expires), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function mac(eventId: string, expires: number): string {
  return createHmac("sha256", secret()).update(`${eventId}.${expires}`).digest("hex");
}

export const cookieName = (eventId: string) => `wow_${eventId}`;
