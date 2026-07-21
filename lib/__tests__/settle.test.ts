import { describe, expect, it } from "vitest";
import type { PartyBalance } from "../balances";
import { partyBalances } from "../balances";
import { minimizeTransfers } from "../settle";
import type { Money } from "../types";
import { expense, makeEvent } from "./helpers";

function balances(entries: Record<string, Money>): PartyBalance[] {
  return Object.entries(entries).map(([id, net]) => ({
    party: { id, name: id, kind: "person", memberIds: [id] },
    net,
  }));
}

describe("minimizeTransfers", () => {
  it("emits nothing when everyone is square", () => {
    expect(minimizeTransfers(balances({ a: 0, b: 0 }))).toEqual([]);
  });

  it("handles a single debt", () => {
    expect(minimizeTransfers(balances({ a: 500, b: -500 }))).toEqual([
      { from: "b", to: "a", amount: 500 },
    ]);
  });

  it("uses at most one fewer transfer than there are parties", () => {
    // Five parties, hand-checked: 4 transfers is the floor here.
    const transfers = minimizeTransfers(
      balances({ a: 5000, b: 2000, c: -1000, d: -3000, e: -3000 }),
    );
    expect(transfers.length).toBeLessThanOrEqual(4);
    expect(transfers.reduce((a, t) => a + t.amount, 0)).toBe(7000);
  });

  it("settles every party to zero", () => {
    const input = { a: 5000, b: 2000, c: -1000, d: -3000, e: -3000 };
    const net = { ...input } as Record<string, number>;
    for (const t of minimizeTransfers(balances(input))) {
      net[t.from] += t.amount;
      net[t.to] -= t.amount;
    }
    expect(Object.values(net).every((v) => v === 0)).toBe(true);
  });

  it("never routes money between two people in a couple", () => {
    const event = makeEvent(["Alice", "Bob", "Carol", "Dave"], {
      couples: [{ id: "c1", memberIds: ["bob", "carol"] }],
      expenses: [
        expense("bob", 4000),
        expense("carol", 2000, { mode: "equal", personIds: ["bob", "carol"] }),
        expense("alice", 1000),
      ],
    });
    const transfers = minimizeTransfers(partyBalances(event));
    const ids = transfers.flatMap((t) => [t.from, t.to]);
    expect(ids).not.toContain("bob");
    expect(ids).not.toContain("carol");
  });

  it("produces the same order on repeated runs", () => {
    const input = balances({ a: 1000, b: 1000, c: -1000, d: -1000 });
    expect(minimizeTransfers(input)).toEqual(minimizeTransfers(input));
  });
});
