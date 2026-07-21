import { splitByShares, splitEvenly } from "./money";
import { partiesFor, partyIndex } from "./parties";
import type { EventDoc, Expense, Money, Party } from "./types";

/** person id -> cents that person owes for this one expense. */
export function shareOf(expense: Expense, allPersonIds: string[]): Record<string, Money> {
  const known = new Set(allPersonIds);
  const out: Record<string, Money> = {};
  const split = expense.split;

  if (split.mode === "exact") {
    for (const [id, cents] of Object.entries(split.amounts)) {
      if (known.has(id)) out[id] = cents;
    }
    return out;
  }

  let ids: string[];
  let weights: number[] | null = null;

  if (split.mode === "all") {
    ids = allPersonIds;
  } else if (split.mode === "equal") {
    ids = split.personIds.filter((id) => known.has(id));
  } else {
    const entries = Object.entries(split.shares).filter(
      ([id, w]) => known.has(id) && w > 0,
    );
    ids = entries.map(([id]) => id);
    weights = entries.map(([, w]) => w);
  }

  // Nobody to split between: charge it back to the payer so the expense still
  // nets to zero rather than silently inventing or destroying money.
  if (ids.length === 0) {
    return known.has(expense.paidBy) ? { [expense.paidBy]: expense.amount } : {};
  }

  const parts = weights
    ? splitByShares(expense.amount, weights)
    : splitEvenly(expense.amount, ids.length);
  ids.forEach((id, i) => {
    out[id] = (out[id] ?? 0) + parts[i];
  });
  return out;
}

export type PersonBalance = {
  personId: string;
  paid: Money;
  owed: Money;
  /** paid - owed. Positive means the group owes them. */
  net: Money;
};

/** Per-person totals, ignoring couples and recorded payments. */
export function personBalances(event: EventDoc): PersonBalance[] {
  const ids = event.people.map((p) => p.id);
  const paid = new Map<string, Money>(ids.map((id) => [id, 0]));
  const owed = new Map<string, Money>(ids.map((id) => [id, 0]));

  for (const expense of event.expenses) {
    if (paid.has(expense.paidBy)) {
      paid.set(expense.paidBy, paid.get(expense.paidBy)! + expense.amount);
    }
    for (const [id, cents] of Object.entries(shareOf(expense, ids))) {
      owed.set(id, (owed.get(id) ?? 0) + cents);
    }
  }

  return event.people.map((p) => ({
    personId: p.id,
    paid: paid.get(p.id)!,
    owed: owed.get(p.id)!,
    net: paid.get(p.id)! - owed.get(p.id)!,
  }));
}

export type PartyBalance = {
  party: Party;
  /** Positive means the group owes this party. */
  net: Money;
};

/**
 * Person balances rolled up into parties, then adjusted by settle-ups that
 * already happened. Rolling up is where debt between two people in a couple
 * cancels out: it never reaches the settlement list.
 */
export function partyBalances(event: EventDoc): PartyBalance[] {
  const parties = partiesFor(event);
  const index = partyIndex(parties);
  const net = new Map<string, Money>(parties.map((p) => [p.id, 0]));

  for (const balance of personBalances(event)) {
    const partyId = index.get(balance.personId);
    if (partyId) net.set(partyId, net.get(partyId)! + balance.net);
  }

  // A payment from X to Y settles part of what X owed: X moves up, Y moves down.
  for (const payment of event.payments) {
    if (net.has(payment.from)) net.set(payment.from, net.get(payment.from)! + payment.amount);
    if (net.has(payment.to)) net.set(payment.to, net.get(payment.to)! - payment.amount);
  }

  return parties.map((party) => ({ party, net: net.get(party.id)! }));
}
