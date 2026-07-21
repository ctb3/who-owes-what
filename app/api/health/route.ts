export const dynamic = "force-dynamic";

/** Readiness probe for the Lambda Web Adapter and for local smoke checks. */
export function GET() {
  return Response.json({ ok: true });
}
