/** All money is integer cents. Never floats. */
export type Money = number;

export type Person = {
  id: string;
  name: string;
};

export type Couple = {
  id: string;
  /** Optional display name; falls back to "A & B". */
  name?: string;
  memberIds: [string, string];
};

export type Split =
  /** Everyone currently in the event, evenly. */
  | { mode: "all" }
  /** A subset, evenly. */
  | { mode: "equal"; personIds: string[] }
  /** Weighted, e.g. someone counts double. */
  | { mode: "shares"; shares: Record<string, number> }
  /** Hand-entered amounts. Must sum to the expense amount. */
  | { mode: "exact"; amounts: Record<string, Money> };

export type Expense = {
  id: string;
  description: string;
  amount: Money;
  /** Person id. */
  paidBy: string;
  /** YYYY-MM-DD */
  date: string;
  split: Split;
};

/** A settle-up that actually happened, between two parties. */
export type Payment = {
  id: string;
  /** Party id. */
  from: string;
  /** Party id. */
  to: string;
  amount: Money;
  date: string;
  note?: string;
};

export type EventDoc = {
  id: string;
  name: string;
  currency: string;
  people: Person[];
  couples: Couple[];
  expenses: Expense[];
  payments: Payment[];
  version: number;
};

/**
 * The unit debts are settled between: a couple, or a person who isn't in one.
 * Couples never owe themselves, so rolling people up into parties is what
 * makes the couples feature work.
 */
export type Party = {
  id: string;
  name: string;
  kind: "person" | "couple";
  memberIds: string[];
};

export type Transfer = {
  from: string;
  to: string;
  amount: Money;
};
