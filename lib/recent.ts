"use client";

/**
 * Events visited on this device. The URL is the only key to an event, so this
 * list is the difference between "come back later" working and not.
 *
 * Exposed as an external store so components can read it with
 * useSyncExternalStore instead of hydrating through an effect.
 */
const KEY = "wow.recentEvents";

export type RecentEvent = { id: string; name: string; visitedAt: string };

const EMPTY: RecentEvent[] = [];

// useSyncExternalStore compares snapshots by identity, so the parsed array is
// cached and only replaced when the underlying JSON actually changes.
let cachedRaw: string | null = null;
let cached: RecentEvent[] = EMPTY;
const listeners = new Set<() => void>();

function read(): string {
  return window.localStorage.getItem(KEY) ?? "[]";
}

export function loadRecent(): RecentEvent[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = read();
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed = JSON.parse(raw);
    cached = Array.isArray(parsed) ? (parsed as RecentEvent[]) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

export function serverSnapshot(): RecentEvent[] {
  return EMPTY;
}

export function subscribeToRecent(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab writing the same key.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(events: RecentEvent[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(events));
  for (const listener of listeners) listener();
}

export function rememberEvent(id: string, name: string): void {
  if (typeof window === "undefined") return;
  const rest = loadRecent().filter((e) => e.id !== id);
  write([{ id, name, visitedAt: new Date().toISOString() }, ...rest].slice(0, 25));
}

export function forgetEvent(id: string): void {
  if (typeof window === "undefined") return;
  write(loadRecent().filter((e) => e.id !== id));
}
