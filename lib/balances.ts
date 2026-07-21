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

  // Floor everyone to their fair share, then hand the leftover cents to whoever
  // paid. The payer is already fronting the money, so absorbing a few cents of
  // rounding is the fair place to put it — and it keeps everyone else on clean,
  // equal shares that don't drift as more expenses are added. (Splitting the
  // remainder across arbitrary participants is what made the same people owe an
  // extra cent on every single expense.)
  const total = weights ? weights.reduce((a, b) => a + b, 0) : ids.length;
  const floors = ids.map((_, i) =>
    weights
      ? Math.floor((expense.amount * weights[i]) / total)
      : Math.trunc(expense.amount / ids.length),
  );
  ids.forEach((id, i) => {
    out[id] = (out[id] ?? 0) + floors[i];
  });

  const remainder = expense.amount - floors.reduce((a, b) => a + b, 0);
  if (remainder !== 0) {
    // If the payer somehow isn't in the event, drop the cents on a participant
    // so the expense still balances to zero.
    const sink = known.has(expense.paidBy) ? expense.paidBy : ids[0];
    out[sink] = (out[sink] ?? 0) + remainder;
  }

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
 * Party balances from expenses alone — no recorded settle-ups applied. Rolling
 * person balances up into parties is where debt between two people in a couple
 * cancels out: it never reaches the settlement list. Settlement works from
 * these so it can route refunds back to whoever was overpaid (see settle.ts).
 */
export function partyExpenseBalances(event: EventDoc): PartyBalance[] {
  const parties = partiesFor(event);
  const index = partyIndex(parties);
  const net = new Map<string, Money>(parties.map((p) => [p.id, 0]));

  for (const balance of personBalances(event)) {
    const partyId = index.get(balance.personId);
    if (partyId) net.set(partyId, net.get(partyId)! + balance.net);
  }

  return parties.map((party) => ({ party, net: net.get(party.id)! }));
}

/**
 * Expense balances adjusted by settle-ups that already happened. A payment from
 * X to Y settles part of what X owed, so X moves up and Y moves down.
 */
export function partyBalances(event: EventDoc): PartyBalance[] {
  const balances = partyExpenseBalances(event);
  const byId = new Map(balances.map((b) => [b.party.id, b]));

  for (const payment of event.payments) {
    const from = byId.get(payment.from);
    if (from) from.net += payment.amount;
    const to = byId.get(payment.to);
    if (to) to.net -= payment.amount;
  }

  return balances;
}
