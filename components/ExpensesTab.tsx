"use client";

import { useState } from "react";
import { useEvent } from "./EventProvider";
import ExpenseDialog from "./ExpenseDialog";
import { formatMoney } from "@/lib/money";
import type { Expense } from "@/lib/types";

export default function ExpensesTab() {
  const { event, update } = useEvent();
  const [editing, setEditing] = useState<Expense | "new" | null>(null);

  const total = event.expenses.reduce((sum, e) => sum + e.amount, 0);
  const sorted = [...event.expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
  const nameOf = (id: string) => event.people.find((p) => p.id === id)?.name ?? "someone";

  function splitLabel(expense: Expense): string {
    const split = expense.split;
    if (split.mode === "all") return `split between everyone (${event.people.length})`;
    if (split.mode === "equal") return `split between ${split.personIds.length}`;
    if (split.mode === "shares") return `split by shares (${Object.keys(split.shares).length})`;
    return `custom amounts (${Object.keys(split.amounts).length})`;
  }

  if (event.people.length === 0) {
    return (
      <p className="text-sm text-muted">
        Add people on the People tab first
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {event.expenses.length} expense{event.expenses.length === 1 ? "" : "s"} &middot;{" "}
          <span className="font-medium text-foreground">{formatMoney(total, event.currency)}</span>{" "}
          total
        </p>
        <button className="btn-primary" type="button" onClick={() => setEditing("new")}>
          Add expense
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">Nothing yet.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {sorted.map((expense) => (
            <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                className="flex-1 min-w-0 text-left"
                onClick={() => setEditing(expense)}
              >
                <span className="block truncate font-medium">
                  {expense.description || "Expense"}
                </span>
                <span className="block text-xs text-muted">
                  {nameOf(expense.paidBy)} paid &middot; {expense.date} &middot;{" "}
                  {splitLabel(expense)}
                </span>
              </button>
              <span className="shrink-0 tabular-nums font-medium">
                {formatMoney(expense.amount, event.currency)}
              </span>
              <button
                type="button"
                className="shrink-0 text-xs text-muted hover:text-negative"
                onClick={() =>
                  update((draft) => ({
                    ...draft,
                    expenses: draft.expenses.filter((e) => e.id !== expense.id),
                  }))
                }
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ExpenseDialog
          expense={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
