import { notFound } from "next/navigation";
import EventShell from "@/components/EventShell";
import UnlockForm from "@/components/UnlockForm";
import { getEvent } from "@/lib/db";
import { hasAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stored = await getEvent(id);
  if (!stored) notFound();

  if (!(await hasAccess(id, stored))) {
    return <UnlockForm eventId={id} />;
  }

  return <EventShell initial={stored.doc} />;
}
