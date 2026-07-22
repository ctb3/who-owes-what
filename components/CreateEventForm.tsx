"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiSend } from "@/lib/api";
import { rememberEvent } from "@/lib/recent";

export default function CreateEventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiSend("/api/events", "POST", {
        name: name.trim(),
        currency,
        ...(usePassphrase && passphrase ? { passphrase } : {}),
      });
      if (!res.ok) throw new Error("Could not create the event");
      const body = (await res.json()) as { id: string; name: string };
      rememberEvent(body.id, body.name);
      router.push(`/e/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div>
        <label className="label" htmlFor="event-name">
          Event name
        </label>
        <input
          id="event-name"
          className="input"
          placeholder="Tahoe weekend"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="max-w-32">
        <label className="label" htmlFor="event-currency">
          Currency
        </label>
        <select
          id="event-currency"
          className="input"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "MXN"].map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={usePassphrase}
            onChange={(e) => setUsePassphrase(e.target.checked)}
          />
          Require a passphrase to open
        </label>
        {usePassphrase && (
          <input
            className="input"
            type="password"
            placeholder="Shared passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            minLength={4}
            required
          />
        )}
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      <button className="btn-primary w-full" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create event"}
      </button>

      <p className="text-xs text-muted">
        The link to your event is the only key to it. Save it somewhere &mdash; anyone with the
        link can view and edit.
      </p>
    </form>
  );
}
