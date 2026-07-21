"use client";

import { useMemo, useState } from "react";
import { useEvent } from "./EventProvider";
import { shareOf } from "@/lib/balances";
import { newId, today } from "@/lib/ids";
import { formatMoney, parseMoney } from "@/lib/money";
import type { Expense, Split } from "@/lib/types";

type Mode = Split["mode"];

const MODE_LABELS: Record<Mode, string> = {
  all: "Everyone",
  equal: "Some people",
  shares: "Shares",
  exact: "Exact amounts",
};

export default function ExpenseDialog({
  expense,
  onClose,
}: {
  expense: Expense | null;
  onClose: () => void;
}) {
  const { event, update } = useEvent();

  const [description, setDescription] = useState(expense?.description ?? "");
  const [amountText, setAmountText] = useState(
    expense ? (expense.amount / 100).toFixed(2) : "",
  );
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? event.people[0]?.id ?? "");
  const [date, setDate] = useState(expense?.date ?? today());
  const [mode, setMode] = useState<Mode>(expense?.split.mode ?? "all");

  const [selected, setSelected] = useState<string[]>(
    expense?.split.mode === "equal" ? expense.split.personIds : event.people.map((p) => p.id),
  );
  const [shares, setShares] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      event.people.map((p) => [
        p.id,
        expense?.split.mode === "shares" ? String(expense.split.shares[p.id] ?? 0) : "1",
      ]),
    ),
  );
  const [exact, setExact] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      event.people.map((p) => [
        p.id,
        expense?.split.mode === "exact" && expense.split.amounts[p.id] != null
          ? (expense.split.amounts[p.id] / 100).toFixed(2)
          : "",
      ]),
    ),
  );

  const amount = parseMoney(amountText);

  const split: Split = useMemo(() => {
    if (mode === "all") return { mode: "all" };
    if (mode === "equal") return { mode: "equal", personIds: selected };
    if (mode === "shares") {
      return {
        mode: "shares",
        shares: Object.fromEntries(
          Object.entries(shares)
            .map(([id, value]) => [id, Number(value) || 0] as const)
            .filter(([, weight]) => weight > 0),
        ),
      };
    }
    return {
      mode: "exact",
      amounts: Object.fromEntries(
        Object.entries(exact)
          .map(([id, value]) => [id, parseMoney(value) ?? 0] as const)
          .filter(([, cents]) => cents !== 0),
      ),
    };
  }, [mode, selected, shares, exact]);

  const exactTotal =
    split.mode === "exact" ? Object.values(split.amounts).reduce((a, b) => a + b, 0) : 0;
  const exactOff = split.mode === "exact" && amount != null ? exactTotal - amount : 0;

  const preview = useMemo(() => {
    if (amount == null) return null;
    return shareOf(
      { id: "preview", description: "", amount, paidBy, date, split },
      event.people.map((p) => p.id),
    );
  }, [amount, paidBy, date, split, event.people]);

  const problem =
    amount == null
      ? "Enter an amount"
      : amount <= 0
        ? "Amount must be more than zero"
        : !paidBy
          ? "Choose who paid"
          : mode === "equal" && selected.length === 0
            ? "Pick at least one person"
            : exactOff !== 0
              ? `Amounts are off by ${formatMoney(Math.abs(exactOff), event.currency)}`
              : null;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (problem || amount == null) return;
    const next: Expense = {
      id: expense?.id ?? newId(),
      description: description.trim(),
      amount,
      paidBy,
      date,
      split,
    };
    update((draft) => ({
      ...draft,
      expenses: expense
        ? draft.expenses.map((e) => (e.id === next.id ? next : e))
        : [...draft.expenses, next],
    }));
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="card w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 space-y-4 rounded-b-none sm:rounded-b-xl"
      >
        <h2 className="text-lg font-semibold">{expense ? "Edit expense" : "Add expense"}</h2>

        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <input
            id="description"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Groceries"
            maxLength={200}
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label" htmlFor="amount">
              Amount ({event.currency})
            </label>
            <input
              id="amount"
              className="input"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex-1">
            <label className="label" htmlFor="date">
              Date
            </label>
            <input
              id="date"
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="paidBy">
            Paid by
          </label>
          <select
            id="paidBy"
            className="input"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
          >
            {event.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-3">
          <legend className="label">Split between</legend>
          <div className="flex flex-wrap gap-1 rounded-lg border border-line p-1">
            {(Object.keys(MODE_LABELS) as Mode[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
                  mode === value ? "bg-accent text-white" : "hover:bg-background"
                }`}
              >
                {MODE_LABELS[value]}
              </button>
            ))}
          </div>

          {mode === "all" && (
            <p className="text-xs text-muted">
              Everyone in the event splits this evenly. People added later are included
              automatically.
            </p>
          )}

          {mode === "equal" && (
            <ul className="space-y-1">
              {event.people.map((person) => (
                <li key={person.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(person.id)}
                      onChange={(e) =>
                        setSelected((current) =>
                          e.target.checked
                            ? [...current, person.id]
                            : current.filter((id) => id !== person.id),
                        )
                      }
                    />
                    {person.name}
                  </label>
                </li>
              ))}
            </ul>
          )}

          {mode === "shares" && (
            <ul className="space-y-1">
              {event.people.map((person) => (
                <li key={person.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{person.name}</span>
                  <input
                    className="input w-20 py-1"
                    inputMode="numeric"
                    value={shares[person.id] ?? "0"}
                    onChange={(e) =>
                      setShares((current) => ({ ...current, [person.id]: e.target.value }))
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          {mode === "exact" && (
            <ul className="space-y-1">
              {event.people.map((person) => (
                <li key={person.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{person.name}</span>
                  <input
                    className="input w-28 py-1"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={exact[person.id] ?? ""}
                    onChange={(e) =>
                      setExact((current) => ({ ...current, [person.id]: e.target.value }))
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {preview && !problem && (
          <div className="rounded-lg bg-background p-3 text-xs text-muted">
            {event.people
              .filter((p) => preview[p.id])
              .map((p) => `${p.name} ${formatMoney(preview[p.id], event.currency)}`)
              .join(" · ")}
          </div>
        )}

        {problem && <p className="text-sm text-negative">{problem}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={problem != null}>
            {expense ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
