import type { PartyBalance } from "./balances";
import type { Money, Transfer } from "./types";

/**
 * Greedy largest-creditor / largest-debtor matching. Each pass zeroes out at
 * least one party, so this emits at most (parties - 1) transfers, which is the
 * fewest possible in the general case.
 *
 * Ties break by party id so the list doesn't reshuffle between renders.
 */
export function minimizeTransfers(balances: PartyBalance[]): Transfer[] {
  const owed = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ id: b.party.id, amount: b.net }));
  const owes = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ id: b.party.id, amount: -b.net }));

  const byAmount = (a: { id: string; amount: Money }, b: { id: string; amount: Money }) =>
    b.amount - a.amount || a.id.localeCompare(b.id);

  const transfers: Transfer[] = [];
  while (owed.length > 0 && owes.length > 0) {
    owed.sort(byAmount);
    owes.sort(byAmount);
    const creditor = owed[0];
    const debtor = owes[0];
    const amount = Math.min(creditor.amount, debtor.amount);

    transfers.push({ from: debtor.id, to: creditor.id, amount });
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount === 0) owed.shift();
    if (debtor.amount === 0) owes.shift();
  }

  return transfers;
}
