import { describe, expect, it } from "vitest";
import { createEventSchema, eventDocSchema, expenseSchema } from "../schema";

const baseExpense = {
  id: "e1",
  description: "Dinner",
  amount: 1000,
  paidBy: "alice",
  date: "2026-07-21",
};

describe("expenseSchema", () => {
  it("accepts a plain even split", () => {
    expect(expenseSchema.safeParse({ ...baseExpense, split: { mode: "all" } }).success).toBe(true);
  });

  it("rejects exact amounts that don't add up to the total", () => {
    const result = expenseSchema.safeParse({
      ...baseExpense,
      split: { mode: "exact", amounts: { alice: 400, bob: 500 } },
    });
    expect(result.success).toBe(false);
  });

  it("accepts exact amounts that do add up", () => {
    const result = expenseSchema.safeParse({
      ...baseExpense,
      split: { mode: "exact", amounts: { alice: 400, bob: 600 } },
    });
    expect(result.success).toBe(true);
  });

  it("rejects fractional cents", () => {
    expect(
      expenseSchema.safeParse({ ...baseExpense, amount: 10.5, split: { mode: "all" } }).success,
    ).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(
      expenseSchema.safeParse({ ...baseExpense, date: "21/07/2026", split: { mode: "all" } })
        .success,
    ).toBe(false);
  });
});

describe("eventDocSchema", () => {
  it("accepts an empty event", () => {
    const result = eventDocSchema.safeParse({
      id: "abc",
      name: "Trip",
      currency: "USD",
      people: [],
      couples: [],
      expenses: [],
      payments: [],
      version: 1,
    });
    expect(result.success).toBe(true);
  });

  it("requires a three-letter currency", () => {
    const result = eventDocSchema.safeParse({
      id: "abc",
      name: "Trip",
      currency: "DOLLARS",
      people: [],
      couples: [],
      expenses: [],
      payments: [],
      version: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("createEventSchema", () => {
  it("defaults the currency", () => {
    const result = createEventSchema.safeParse({ name: "Trip" });
    expect(result.success && result.data.currency).toBe("USD");
  });

  it("rejects a too-short passphrase", () => {
    expect(createEventSchema.safeParse({ name: "Trip", passphrase: "ab" }).success).toBe(false);
  });
});
