import { getEvent, putEventDoc } from "@/lib/db";
import { hasAccess, jsonError } from "@/lib/guard";
import { putEventSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const stored = await getEvent(id);
  if (!stored) return jsonError(404, "Not found");
  if (!(await hasAccess(id, stored))) return jsonError(401, "locked");

  return Response.json({ doc: stored.doc, updatedAt: stored.updatedAt });
}

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const stored = await getEvent(id);
  if (!stored) return jsonError(404, "Not found");
  if (!(await hasAccess(id, stored))) return jsonError(401, "locked");

  const parsed = putEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "Invalid event", { issues: parsed.error.issues });
  }

  // Last write wins, but bump the version so clients can tell docs apart.
  const doc = { ...parsed.data, id, version: stored.doc.version + 1 };
  const updatedAt = await putEventDoc(doc);
  return Response.json({ doc, updatedAt });
}
