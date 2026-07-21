"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  forgetEvent,
  loadRecent,
  serverSnapshot,
  subscribeToRecent,
} from "@/lib/recent";

export default function RecentEvents() {
  // localStorage isn't available while rendering on the server, so the server
  // snapshot is empty and the list fills in on hydration.
  const events = useSyncExternalStore(subscribeToRecent, loadRecent, serverSnapshot);

  if (events.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">
        Your events
      </h2>
      <ul className="card divide-y divide-line">
        {events.map((event) => (
          <li key={event.id} className="flex items-center gap-3 px-4 py-3">
            <Link href={`/e/${event.id}`} className="flex-1 min-w-0">
              <span className="block truncate font-medium">{event.name}</span>
              <span className="block text-xs text-muted">
                Opened {new Date(event.visitedAt).toLocaleDateString()}
              </span>
            </Link>
            <button
              type="button"
              className="text-xs text-muted hover:text-negative"
              onClick={() => forgetEvent(event.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Remembered on this device only. Removing one here does not delete the event.
      </p>
    </section>
  );
}
