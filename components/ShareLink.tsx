"use client";

import { useState, useSyncExternalStore } from "react";
import { useEvent } from "./EventProvider";
import { apiSend } from "@/lib/api";
import { loadPassphrase, rememberPassphrase } from "@/lib/recent";

const noop = () => () => {};

type Copied = "link" | "invite" | null;

export default function ShareLink({ isProtected }: { isProtected: boolean }) {
  const { event } = useEvent();
  // Rendered blank on the server, filled in on hydration.
  const url = useSyncExternalStore(
    noop,
    () => window.location.href,
    () => "",
  );
  const [copied, setCopied] = useState<Copied>(null);
  // Shown when this device never saw the passphrase (e.g. storage was cleared).
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy(text: string, which: Copied) {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  const invite = (passphrase: string) => `${event.name}\n${url}\nPassphrase: ${passphrase}`;

  async function copyInvite() {
    const known = loadPassphrase(event.id);
    if (known) return copy(invite(known), "invite");
    setAsking(true);
  }

  // Checked against the server so a typo never gets sent to a friend.
  async function confirmTyped(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await apiSend(`/api/events/${event.id}/unlock`, "POST", { passphrase: typed });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not check passphrase");
      return;
    }
    rememberPassphrase(event.id, typed);
    setAsking(false);
    setTyped("");
    await copy(invite(typed), "invite");
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
        <input
          readOnly
          value={url}
          className="flex-1 min-w-40 bg-transparent text-xs text-muted"
        />
        <button type="button" className="btn-ghost py-1 text-xs" onClick={() => copy(url, "link")}>
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
        {isProtected && (
          <button type="button" className="btn-ghost py-1 text-xs" onClick={copyInvite}>
            {copied === "invite" ? "Copied" : "Copy link + passphrase"}
          </button>
        )}
      </div>

      {asking && (
        <form onSubmit={confirmTyped} className="card space-y-2 p-3">
          <p className="text-xs text-muted">
            This device doesn&rsquo;t know the passphrase. Enter it once to include it.
          </p>
          <div className="flex gap-2">
            <input
              className="input py-1 text-sm"
              type="password"
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              required
            />
            <button className="btn-primary shrink-0 py-1 text-xs" type="submit" disabled={busy}>
              {busy ? "Checking…" : "Copy"}
            </button>
            <button
              type="button"
              className="btn-ghost shrink-0 py-1 text-xs"
              onClick={() => {
                setAsking(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-negative">{error}</p>}
        </form>
      )}
    </div>
  );
}
