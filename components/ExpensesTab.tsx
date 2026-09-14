"use client";

import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { useEvent } from "./EventProvider";
import ExpenseDialog from "./ExpenseDialog";
import { describeSplit, expensesAsCsv, expensesAsText } from "@/lib/export";
import { formatMoney } from "@/lib/money";
import type { Expense } from "@/lib/types";

export default function ExpensesTab() {
  const { event, update } = useEvent();
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [copied, setCopied] = useState(false);

  const total = event.expenses.reduce((sum, e) => sum + e.amount, 0);
  const sorted = [...event.expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
  const nameOf = (id: string) => event.people.find((p) => p.id === id)?.name ?? "someone";

  async function copyList() {
    await navigator.clipboard.writeText(expensesAsText(event));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadCsv() {
    // BOM so Excel reads names and descriptions as UTF-8.
    const blob = new Blob(["\uFEFF", expensesAsCsv(event)], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${event.name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "event"}-expenses.csv`;
    link.click();
    // Revoking right away can cancel the download in Safari.
    setTimeout(() => URL.revokeObjectURL(href), 1000);
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {event.expenses.length} expense{event.expenses.length === 1 ? "" : "s"} &middot;{" "}
          <span className="font-medium text-foreground">{formatMoney(total, event.currency)}</span>{" "}
          total
        </p>
        <div className="flex gap-2">
          {sorted.length > 0 && (
            <>
              <button className="btn-ghost" type="button" onClick={copyList}>
                {copied ? "Copied" : "Copy list"}
              </button>
              <button className="btn-ghost" type="button" onClick={downloadCsv}>
                Export CSV
              </button>
            </>
          )}
          <button className="btn-primary" type="button" onClick={() => setEditing("new")}>
            Add expense
          </button>
        </div>
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
                  {describeSplit(expense.split, event.people.length)}
                </span>
              </button>
              <span className="shrink-0 tabular-nums font-medium">
                {formatMoney(expense.amount, event.currency)}
              </span>
              <button
                type="button"
                className="shrink-0 text-xs text-muted hover:text-negative"
                onClick={() => setDeleting(expense)}
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

      {deleting && (
        <ConfirmDialog
          title="Delete this expense?"
          message={`${deleting.description || "Expense"} · ${formatMoney(deleting.amount, event.currency)}. This can't be undone.`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const id = deleting.id;
            update((draft) => ({
              ...draft,
              expenses: draft.expenses.filter((e) => e.id !== id),
            }));
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
