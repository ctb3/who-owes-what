"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UnlockForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${eventId}/unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passphrase }),
    });
    if (res.ok) {
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError(body.error ?? "Could not unlock");
    setBusy(false);
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Passphrase needed</h1>
      <p className="text-muted text-sm mb-6">This event is protected.</p>
      <form onSubmit={submit} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="passphrase">
            Passphrase
          </label>
          <input
            id="passphrase"
            className="input"
            type="password"
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <button className="btn-primary w-full" type="submit" disabled={busy}>
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
