import type { Couple, EventDoc, Expense, Payment } from "../types";

export function makeEvent(
  people: string[],
  opts: {
    couples?: Couple[];
    expenses?: Expense[];
    payments?: Payment[];
  } = {},
): EventDoc {
  return {
    id: "test",
    name: "Test",
    currency: "USD",
    people: people.map((name) => ({ id: name.toLowerCase(), name })),
    couples: opts.couples ?? [],
    expenses: opts.expenses ?? [],
    payments: opts.payments ?? [],
    version: 1,
  };
}

let counter = 0;
export function expense(
  paidBy: string,
  amount: number,
  split: Expense["split"] = { mode: "all" },
): Expense {
  return {
    id: `e${counter++}`,
    description: "thing",
    amount,
    paidBy,
    date: "2026-07-21",
    split,
  };
}
