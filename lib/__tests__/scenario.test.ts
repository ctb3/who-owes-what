import { describe, expect, it } from "vitest";
import { partyBalances, personBalances } from "../balances";
import { minimizeTransfers } from "../settle";
import type { EventDoc } from "../types";

/**
 * The worked example from the README, checked by hand:
 *
 *   $120 dinner   paid by Alice, split four ways        -> $30 each
 *   $50  gas      paid by Bob,   split Bob + Carol only -> inside the couple
 *   $40  lift     paid by Carol, split Alice + Dave     -> $20 each
 *
 * Per person: Alice +$70, Bob -$5, Carol -$15, Dave -$50.
 * As parties: Alice +$70, Bob & Carol -$20, Dave -$50 — and the gas never
 * shows up, because it moved money inside the couple.
 */
const trip: EventDoc = {
  id: "trip",
  name: "Smoke trip",
  currency: "USD",
  version: 1,
  people: [
    { id: "alice", name: "Alice" },
    { id: "bob", name: "Bob" },
    { id: "carol", name: "Carol" },
    { id: "dave", name: "Dave" },
  ],
  couples: [{ id: "c1", memberIds: ["bob", "carol"] }],
  expenses: [
    {
      id: "e1",
      description: "Dinner",
      amount: 12000,
      paidBy: "alice",
      date: "2026-07-20",
      split: { mode: "all" },
    },
    {
      id: "e2",
      description: "Gas",
      amount: 5000,
      paidBy: "bob",
      date: "2026-07-20",
      split: { mode: "equal", personIds: ["bob", "carol"] },
    },
    {
      id: "e3",
      description: "Lift tickets",
      amount: 4000,
      paidBy: "carol",
      date: "2026-07-21",
      split: { mode: "equal", personIds: ["alice", "dave"] },
    },
  ],
  payments: [],
};

describe("worked trip example", () => {
  it("matches the hand-calculated per-person balances", () => {
    const net = Object.fromEntries(personBalances(trip).map((b) => [b.personId, b.net]));
    expect(net).toEqual({ alice: 7000, bob: -500, carol: -1500, dave: -5000 });
  });

  it("groups the couple into one party balance", () => {
    const net = Object.fromEntries(partyBalances(trip).map((b) => [b.party.id, b.net]));
    expect(net).toEqual({ alice: 7000, c1: -2000, dave: -5000 });
  });

  it("settles in two payments, neither inside the couple", () => {
    expect(minimizeTransfers(partyBalances(trip))).toEqual([
      { from: "dave", to: "alice", amount: 5000 },
      { from: "c1", to: "alice", amount: 2000 },
    ]);
  });

  it("goes flat once both payments are recorded", () => {
    const settled: EventDoc = {
      ...trip,
      payments: [
        { id: "p1", from: "dave", to: "alice", amount: 5000, date: "2026-07-22" },
        { id: "p2", from: "c1", to: "alice", amount: 2000, date: "2026-07-22" },
      ],
    };
    expect(minimizeTransfers(partyBalances(settled))).toEqual([]);
  });
});
