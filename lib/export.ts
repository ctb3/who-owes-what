import { shareOf } from "./balances";
import { formatMoney } from "./money";
import type { EventDoc, Expense, Money, Split } from "./types";

export function describeSplit(split: Split, peopleCount: number): string {
  if (split.mode === "all") return `split between everyone (${peopleCount})`;
  if (split.mode === "equal") return `split between ${split.personIds.length}`;
  if (split.mode === "shares") return `split by shares (${Object.keys(split.shares).length})`;
  return `custom amounts (${Object.keys(split.amounts).length})`;
}

function chronological(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function nameLookup(event: EventDoc): (id: string) => string {
  return (id) => event.people.find((p) => p.id === id)?.name ?? "someone";
}

/** Plain text meant for pasting into a chat message. */
export function expensesAsText(event: EventDoc): string {
  const money = (cents: Money) => formatMoney(cents, event.currency);
  const nameOf = nameLookup(event);
  const total = event.expenses.reduce((sum, e) => sum + e.amount, 0);
  const count = event.expenses.length;

  const header = `${event.name}: ${count} expense${count === 1 ? "" : "s"}, ${money(total)} total`;
  const lines = chronological(event.expenses).map((e) =>
    [
      e.date,
      e.description || "Expense",
      money(e.amount),
      `${nameOf(e.paidBy)} paid`,
      describeSplit(e.split, event.people.length),
    ].join(" · "),
  );
  return lines.length ? [header, "", ...lines].join("\n") : header;
}

/**
 * Quotes a CSV field when needed. Text a spreadsheet would read as a formula
 * gets a leading apostrophe, since anyone with the link can write descriptions.
 */
function csvText(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

const csvMoney = (cents: Money) => (cents / 100).toFixed(2);

/** One row per expense, oldest first, with each person's share in their own column. */
export function expensesAsCsv(event: EventDoc): string {
  const nameOf = nameLookup(event);
  const personIds = event.people.map((p) => p.id);
  const totals: Record<string, Money> = {};
  let total = 0;

  const rows = chronological(event.expenses).map((e) => {
    const shares = shareOf(e, personIds);
    total += e.amount;
    for (const id of personIds) totals[id] = (totals[id] ?? 0) + (shares[id] ?? 0);
    return [
      e.date,
      csvText(e.description),
      csvMoney(e.amount),
      csvText(nameOf(e.paidBy)),
      csvText(describeSplit(e.split, event.people.length)),
      ...personIds.map((id) => csvMoney(shares[id] ?? 0)),
    ];
  });

  return [
    ["Date", "Description", "Amount", "Paid by", "Split", ...event.people.map((p) => csvText(p.name))],
    ...rows,
    ["Total", "", csvMoney(total), "", "", ...personIds.map((id) => csvMoney(totals[id] ?? 0))],
  ]
    .map((row) => row.join(","))
    .join("\r\n");
}
