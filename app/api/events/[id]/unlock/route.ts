import { verifyPassphrase } from "@/lib/auth";
import { bumpUnlockAttempts, getEvent, getUnlockAttempts } from "@/lib/db";
import { grantAccess, jsonError } from "@/lib/guard";
import { unlockSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

/** Failed attempts allowed per 15 minutes before the event stops answering. */
const MAX_ATTEMPTS = 10;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = unlockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Invalid request");

  const stored = await getEvent(id);
  if (!stored) return jsonError(404, "Not found");
  if (!stored.passphrase) {
    await grantAccess(id);
    return Response.json({ ok: true });
  }

  if ((await getUnlockAttempts(id)) >= MAX_ATTEMPTS) {
    return jsonError(429, "Too many attempts. Try again in a few minutes.");
  }

  if (!verifyPassphrase(parsed.data.passphrase, stored.passphrase)) {
    await bumpUnlockAttempts(id);
    return jsonError(401, "Wrong passphrase");
  }

  await grantAccess(id);
  return Response.json({ ok: true });
}
