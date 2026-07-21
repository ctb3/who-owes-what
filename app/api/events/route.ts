import { hashPassphrase, newEventId } from "@/lib/auth";
import { createEvent } from "@/lib/db";
import { grantAccess, jsonError } from "@/lib/guard";
import { createEventSchema } from "@/lib/schema";
import type { EventDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = createEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Invalid request");

  const { name, currency, passphrase } = parsed.data;
  const doc: EventDoc = {
    id: newEventId(),
    name,
    currency: currency.toUpperCase(),
    people: [],
    couples: [],
    expenses: [],
    payments: [],
    version: 1,
  };

  await createEvent(doc, passphrase ? hashPassphrase(passphrase) : undefined);
  // Whoever just created it shouldn't have to type the passphrase back.
  if (passphrase) await grantAccess(doc.id);

  return Response.json({ id: doc.id, name: doc.name }, { status: 201 });
}
