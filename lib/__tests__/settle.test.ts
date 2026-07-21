import { describe, expect, it } from "vitest";
import type { PartyBalance } from "../balances";
import { partyBalances } from "../balances";
import { minimizeTransfers, settleEvent } from "../settle";
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

describe("settleEvent", () => {
  it("matches minimizeTransfers when nothing has been paid yet", () => {
    const event = makeEvent(["Alice", "Bob", "Carol"], {
      expenses: [expense("alice", 3000)],
    });
    expect(settleEvent(event)).toEqual([
      { from: "bob", to: "alice", amount: 1000 },
      { from: "carol", to: "alice", amount: 1000 },
    ]);
  });

  it("drops a debt that has been settled exactly", () => {
    const event = makeEvent(["Alice", "Bob", "Carol"], {
      expenses: [expense("alice", 3000)],
      payments: [{ id: "p1", from: "bob", to: "alice", amount: 1000, date: "2026-07-21" }],
    });
    expect(settleEvent(event)).toEqual([{ from: "carol", to: "alice", amount: 1000 }]);
  });

  it("refunds an overpayment from the party that was overpaid", () => {
    // The reported case: everyone owes the couple $18.75, but stephen paid them
    // $21.42 — $2.67 too much. The couple should hand that $2.67 back, and no
    // one else's payment should be split to cover it.
    const event = makeEvent(
      ["Carl", "Macy", "Meghan", "Hunter", "Eric", "Stephen", "Asdf", "Zxcv"],
      {
        couples: [{ id: "cm", memberIds: ["carl", "macy"] }],
        expenses: [expense("carl", 10000), expense("macy", 5000)],
        payments: [{ id: "p1", from: "stephen", to: "cm", amount: 2142, date: "2026-07-21" }],
      },
    );
    const transfers = settleEvent(event);

    // Every remaining debtor pays the couple a clean, whole $18.75.
    for (const id of ["meghan", "hunter", "eric", "asdf", "zxcv"]) {
      expect(transfers).toContainEqual({ from: id, to: "cm", amount: 1875 });
    }
    // The couple refunds stephen the overpayment — stephen pays no one.
    expect(transfers).toContainEqual({ from: "cm", to: "stephen", amount: 267 });
    expect(transfers.filter((t) => t.from === "stephen")).toEqual([]);
    expect(transfers).toHaveLength(6);
  });

  it("still balances everyone to zero after routing", () => {
    const event = makeEvent(["Carl", "Macy", "Meghan", "Stephen"], {
      couples: [{ id: "cm", memberIds: ["carl", "macy"] }],
      expenses: [expense("carl", 12000)],
      payments: [{ id: "p1", from: "stephen", to: "cm", amount: 5000, date: "2026-07-21" }],
    });
    const net = new Map<string, number>();
    for (const b of partyBalances(event)) net.set(b.party.id, b.net);
    for (const t of settleEvent(event)) {
      net.set(t.from, (net.get(t.from) ?? 0) + t.amount);
      net.set(t.to, (net.get(t.to) ?? 0) - t.amount);
    }
    expect([...net.values()].every((v) => v === 0)).toBe(true);
  });
});
