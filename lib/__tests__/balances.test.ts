import { describe, expect, it } from "vitest";
import { partyBalances, personBalances, shareOf } from "../balances";
import { expense, makeEvent } from "./helpers";

const netOf = (event: ReturnType<typeof makeEvent>, personId: string) =>
  personBalances(event).find((b) => b.personId === personId)!.net;

describe("shareOf", () => {
  const ids = ["alice", "bob", "carol"];

  it("defaults to the whole group", () => {
    expect(shareOf(expense("alice", 900), ids)).toEqual({
      alice: 300,
      bob: 300,
      carol: 300,
    });
  });

  it("splits between a subset", () => {
    expect(
      shareOf(expense("alice", 900, { mode: "equal", personIds: ["bob", "carol"] }), ids),
    ).toEqual({ bob: 450, carol: 450 });
  });

  it("ignores participants who left the event", () => {
    expect(
      shareOf(expense("alice", 900, { mode: "equal", personIds: ["bob", "dave"] }), ids),
    ).toEqual({ bob: 900 });
  });

  it("charges the payer when nobody is participating", () => {
    expect(shareOf(expense("alice", 900, { mode: "equal", personIds: [] }), ids)).toEqual({
      alice: 900,
    });
  });

  it("applies share weights", () => {
    expect(
      shareOf(expense("alice", 1000, { mode: "shares", shares: { alice: 1, bob: 3 } }), ids),
    ).toEqual({ alice: 250, bob: 750 });
  });

  it("passes exact amounts through", () => {
    expect(
      shareOf(expense("alice", 1000, { mode: "exact", amounts: { alice: 400, bob: 600 } }), ids),
    ).toEqual({ alice: 400, bob: 600 });
  });

  it("hands rounding cents to the payer, keeping everyone else even", () => {
    // $10 three ways doesn't divide evenly. Bob and Carol owe a clean $3.33;
    // Alice (who paid) absorbs the leftover cent.
    expect(shareOf(expense("alice", 1000), ids)).toEqual({
      alice: 334,
      bob: 333,
      carol: 333,
    });
  });

  it("shorts the payer even when they aren't in the split", () => {
    // Alice paid for something only Bob and Carol used; $10 / 2 is clean, but
    // an odd amount leaves a cent, and it lands on Alice, not a participant.
    expect(
      shareOf(expense("alice", 1001, { mode: "equal", personIds: ["bob", "carol"] }), ids),
    ).toEqual({ bob: 500, carol: 500, alice: 1 });
  });
});

describe("personBalances", () => {
  it("nets paid against owed", () => {
    const event = makeEvent(["Alice", "Bob", "Carol"], {
      expenses: [expense("alice", 900), expense("bob", 300)],
    });
    expect(netOf(event, "alice")).toBe(900 - 400);
    expect(netOf(event, "bob")).toBe(300 - 400);
    expect(netOf(event, "carol")).toBe(0 - 400);
  });

  it("nets to zero across everyone", () => {
    const event = makeEvent(["Alice", "Bob", "Carol"], {
      expenses: [expense("alice", 1000), expense("carol", 733)],
    });
    const total = personBalances(event).reduce((a, b) => a + b.net, 0);
    expect(total).toBe(0);
  });
});

describe("partyBalances with couples", () => {
  const couple = {
    id: "c1",
    memberIds: ["bob", "carol"] as [string, string],
  };

  it("cancels debt inside a couple", () => {
    // Bob pays for a dinner shared only by Bob and Carol. They are a couple,
    // so nothing should be owed at all.
    const event = makeEvent(["Alice", "Bob", "Carol"], {
      couples: [couple],
      expenses: [expense("bob", 1000, { mode: "equal", personIds: ["bob", "carol"] })],
    });
    const balances = partyBalances(event);
    expect(balances.find((b) => b.party.id === "c1")!.net).toBe(0);
    expect(balances.find((b) => b.party.id === "alice")!.net).toBe(0);
  });

  it("charges a couple two full shares", () => {
    // $30 across Alice, Bob, Carol: $10 each. The couple owes $20 as one unit.
    const event = makeEvent(["Alice", "Bob", "Carol"], {
      couples: [couple],
      expenses: [expense("alice", 3000)],
    });
    const balances = partyBalances(event);
    expect(balances.find((b) => b.party.id === "alice")!.net).toBe(2000);
    expect(balances.find((b) => b.party.id === "c1")!.net).toBe(-2000);
  });

  it("names a couple after its members by default", () => {
    const event = makeEvent(["Alice", "Bob", "Carol"], { couples: [couple] });
    expect(partyBalances(event).find((b) => b.party.id === "c1")!.party.name).toBe("Bob & Carol");
  });

  it("credits a payment made by one partner to the whole couple", () => {
    const event = makeEvent(["Alice", "Bob", "Carol"], {
      couples: [couple],
      expenses: [expense("bob", 3000)],
    });
    const balances = partyBalances(event);
    expect(balances.find((b) => b.party.id === "c1")!.net).toBe(1000);
    expect(balances.find((b) => b.party.id === "alice")!.net).toBe(-1000);
  });

  it("reduces balances by recorded settle-ups", () => {
    const event = makeEvent(["Alice", "Bob", "Carol"], {
      couples: [couple],
      expenses: [expense("alice", 3000)],
      payments: [{ id: "p1", from: "c1", to: "alice", amount: 2000, date: "2026-07-21" }],
    });
    for (const balance of partyBalances(event)) {
      expect(balance.net).toBe(0);
    }
  });

  it("keeps non-payers even when the total divides cleanly across two expenses", () => {
    // The reported bug: carl paid $100 and macy paid $50 across 6 people. $150/6
    // is exactly $25, but splitting each expense on its own used to leave the
    // same people owing $25.01 while others owed $24.99. With the payer soaking
    // up the odd cents, everyone who didn't pay owes the same clean amount.
    const event = makeEvent(["Carl", "Meghan", "Hunter", "Eric", "Macy", "Stephen"], {
      couples: [{ id: "cm", memberIds: ["carl", "macy"] }],
      expenses: [expense("carl", 10000), expense("macy", 5000)],
    });
    const owed = new Map(personBalances(event).map((b) => [b.personId, b.owed]));
    for (const id of ["meghan", "hunter", "eric", "stephen"]) {
      expect(owed.get(id)).toBe(2499);
    }
    // The couple that paid absorbs the four leftover cents between them.
    expect(owed.get("carl")! + owed.get("macy")!).toBe(2503 + 2501);

    const couple = partyBalances(event).find((b) => b.party.id === "cm")!;
    expect(couple.net).toBe(9996);
  });

  it("still counts a person whose couple references someone who left", () => {
    const event = makeEvent(["Alice", "Bob"], {
      couples: [{ id: "c1", memberIds: ["bob", "carol"] }],
      expenses: [expense("alice", 1000)],
    });
    const balances = partyBalances(event);
    expect(balances.map((b) => b.party.id).sort()).toEqual(["alice", "c1"]);
    expect(balances.find((b) => b.party.id === "c1")!.net).toBe(-500);
  });
});
