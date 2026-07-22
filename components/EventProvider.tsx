"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiSend } from "@/lib/api";
import { rememberEvent } from "@/lib/recent";
import type { EventDoc } from "@/lib/types";

export type SaveState = "idle" | "saving" | "saved" | "error";

type EventContextValue = {
  event: EventDoc;
  update: (recipe: (draft: EventDoc) => EventDoc) => void;
  saveState: SaveState;
  retry: () => void;
  refresh: () => Promise<void>;
};

const EventContext = createContext<EventContextValue | null>(null);

export function useEvent(): EventContextValue {
  const value = useContext(EventContext);
  if (!value) throw new Error("useEvent must be used inside <EventProvider>");
  return value;
}

const SAVE_DEBOUNCE_MS = 800;

export function EventProvider({
  initial,
  children,
}: {
  initial: EventDoc;
  children: React.ReactNode;
}) {
  const [event, setEvent] = useState<EventDoc>(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Held in a ref so the debounce timer always flushes the newest doc, and so
  // the save effect doesn't re-run on every keystroke.
  const pending = useRef<EventDoc | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const flush = useCallback(async () => {
    const doc = pending.current;
    if (!doc) return;
    setSaveState("saving");
    try {
      const res = await apiSend(`/api/events/${doc.id}`, "PUT", { ...doc, id: undefined });
      if (!res.ok) throw new Error(await res.text());
      // Only clear the pending doc if nothing newer arrived mid-flight.
      if (pending.current === doc) {
        pending.current = null;
        dirty.current = false;
        setSaveState("saved");
      }
    } catch {
      setSaveState("error");
    }
  }, []);

  const update = useCallback(
    (recipe: (draft: EventDoc) => EventDoc) => {
      setEvent((current) => {
        const next = recipe(current);
        pending.current = next;
        dirty.current = true;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
        return next;
      });
    },
    [flush],
  );

  const refresh = useCallback(async () => {
    // Never clobber edits that haven't reached the server yet.
    if (dirty.current) return;
    const res = await fetch(`/api/events/${initial.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { doc: EventDoc };
    setEvent((current) => (body.doc.version > current.version ? body.doc : current));
  }, [initial.id]);

  useEffect(() => {
    rememberEvent(event.id, event.name);
  }, [event.id, event.name]);

  // Pick up edits made from another device when returning to the tab.
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // Don't let the tab close on an unsaved edit without saying so.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!pending.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const value = useMemo(
    () => ({ event, update, saveState, retry: flush, refresh }),
    [event, update, saveState, flush, refresh],
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}
