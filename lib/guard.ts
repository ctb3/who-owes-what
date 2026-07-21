import { cookies } from "next/headers";
import { cookieName, signAccessToken, verifyAccessToken } from "./auth";
import type { StoredEvent } from "./db";

export async function hasAccess(id: string, stored: StoredEvent): Promise<boolean> {
  if (!stored.passphrase) return true;
  const jar = await cookies();
  return verifyAccessToken(id, jar.get(cookieName(id))?.value);
}

export async function grantAccess(id: string): Promise<void> {
  const jar = await cookies();
  jar.set(cookieName(id), signAccessToken(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export function jsonError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return Response.json({ error, ...extra }, { status });
}
