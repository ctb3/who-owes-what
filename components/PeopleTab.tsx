"use client";

import { useMemo, useState } from "react";
import { useEvent } from "./EventProvider";
import { newId } from "@/lib/ids";
import { displayCoupleName } from "@/lib/parties";
import type { Person } from "@/lib/types";

export default function PeopleTab() {
  const { event, update } = useEvent();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const coupleOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const couple of event.couples) {
      for (const id of couple.memberIds) map.set(id, couple.id);
    }
    return map;
  }, [event.couples]);

  const usedPersonIds = useMemo(() => {
    const used = new Set<string>();
    for (const expense of event.expenses) {
      used.add(expense.paidBy);
      if (expense.split.mode === "equal") expense.split.personIds.forEach((id) => used.add(id));
      if (expense.split.mode === "shares") Object.keys(expense.split.shares).forEach((id) => used.add(id));
      if (expense.split.mode === "exact") Object.keys(expense.split.amounts).forEach((id) => used.add(id));
    }
    return used;
  }, [event.expenses]);

  function addPerson(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    update((draft) => ({
      ...draft,
      people: [...draft.people, { id: newId(), name: trimmed }],
    }));
    setName("");
  }

  function rename(id: string, value: string) {
    update((draft) => ({
      ...draft,
      people: draft.people.map((p) => (p.id === id ? { ...p, name: value } : p)),
    }));
  }

  function remove(person: Person) {
    if (usedPersonIds.has(person.id)) {
      setError(`${person.name} appears in an expense. Remove or edit those first.`);
      return;
    }
    setError(null);
    update((draft) => ({
      ...draft,
      people: draft.people.filter((p) => p.id !== person.id),
      couples: draft.couples.filter((c) => !c.memberIds.includes(person.id)),
      payments: draft.payments.filter((p) => p.from !== person.id && p.to !== person.id),
    }));
  }

  const unpaired = event.people.filter((p) => !coupleOf.has(p.id));

  return (
    <div className="space-y-6">
      <form onSubmit={addPerson} className="flex gap-2">
        <input
          className="input"
          placeholder="Add a person"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
        <button className="btn-primary shrink-0" type="submit">
          Add
        </button>
      </form>

      {error && <p className="text-sm text-negative">{error}</p>}

      {event.people.length === 0 ? (
        <p className="text-sm text-muted">No one here yet. Add the people sharing costs.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {event.people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 px-4 py-3">
              <input
                className="flex-1 min-w-0 bg-transparent outline-none"
                value={person.name}
                onChange={(e) => rename(person.id, e.target.value)}
                maxLength={80}
              />
              {coupleOf.has(person.id) && (
                <span className="text-xs text-muted">in a couple</span>
              )}
              <button
                type="button"
                className="text-xs text-muted hover:text-negative"
                onClick={() => remove(person)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <CouplesSection unpaired={unpaired} />
    </div>
  );
}

function CouplesSection({ unpaired }: { unpaired: Person[] }) {
  const { event, update } = useEvent();
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");

  function pair(e: React.FormEvent) {
    e.preventDefault();
    if (!first || !second || first === second) return;
    update((draft) => ({
      ...draft,
      couples: [...draft.couples, { id: newId(), memberIds: [first, second] }],
    }));
    setFirst("");
    setSecond("");
  }

  function unpair(coupleId: string) {
    update((draft) => ({
      ...draft,
      couples: draft.couples.filter((c) => c.id !== coupleId),
      // Settle-ups were recorded against the couple as a unit; they can't be
      // reassigned to an individual, so they go with it.
      payments: draft.payments.filter((p) => p.from !== coupleId && p.to !== coupleId),
    }));
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Couples</h2>
        <p className="mt-1 text-xs text-muted">
          A couple still pays two full shares. They just settle up as one, and never with each
          other.
        </p>
      </div>

      {event.couples.length > 0 && (
        <ul className="card divide-y divide-line">
          {event.couples.map((couple) => (
            <li key={couple.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 min-w-0 truncate">
                {displayCoupleName(couple, event.people)}
              </span>
              <button
                type="button"
                className="text-xs text-muted hover:text-negative"
                onClick={() => unpair(couple.id)}
              >
                Unpair
              </button>
            </li>
          ))}
        </ul>
      )}

      {unpaired.length >= 2 && (
        <form onSubmit={pair} className="flex flex-wrap gap-2">
          <select className="input flex-1" value={first} onChange={(e) => setFirst(e.target.value)}>
            <option value="">Choose…</option>
            {unpaired.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="input flex-1"
            value={second}
            onChange={(e) => setSecond(e.target.value)}
          >
            <option value="">Choose…</option>
            {unpaired
              .filter((p) => p.id !== first)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <button className="btn-ghost shrink-0" type="submit" disabled={!first || !second}>
            Pair as a couple
          </button>
        </form>
      )}
    </section>
  );
}
