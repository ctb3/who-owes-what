import { describe, expect, it } from "vitest";
import { describeSplit, expensesAsCsv, expensesAsText } from "../export";
import { expense, makeEvent } from "./helpers";

function sample() {
  const drinks = { ...expense("alice", 3000), description: "Drinks", date: "2026-07-02" };
  const cabin = {
    ...expense("bob", 10000, { mode: "equal", personIds: ["alice", "bob"] }),
    description: "Cabin, deposit",
    date: "2026-07-01",
  };
  return makeEvent(["Alice", "Bob", "Cara"], { expenses: [drinks, cabin] });
}

describe("describeSplit", () => {
  it("labels each mode", () => {
    expect(describeSplit({ mode: "all" }, 3)).toBe("split between everyone (3)");
    expect(describeSplit({ mode: "equal", personIds: ["a", "b"] }, 3)).toBe("split between 2");
    expect(describeSplit({ mode: "shares", shares: { a: 1, b: 2 } }, 3)).toBe(
      "split by shares (2)",
    );
    expect(describeSplit({ mode: "exact", amounts: { a: 100 } }, 3)).toBe("custom amounts (1)");
  });
});

describe("expensesAsText", () => {
  it("lists expenses oldest first with a total", () => {
    expect(expensesAsText(sample())).toBe(
      [
        "Test: 2 expenses, $130.00 total",
        "",
        "2026-07-01 · Cabin, deposit · $100.00 · Bob paid · split between 2",
        "2026-07-02 · Drinks · $30.00 · Alice paid · split between everyone (3)",
      ].join("\n"),
    );
  });

  it("says so when there is nothing", () => {
    expect(expensesAsText(makeEvent(["Alice"]))).toBe("Test: 0 expenses, $0.00 total");
  });
});

describe("expensesAsCsv", () => {
  it("has a column per person holding their share, and a total row", () => {
    expect(expensesAsCsv(sample()).split("\r\n")).toEqual([
      "Date,Description,Amount,Paid by,Split,Alice,Bob,Cara",
      '2026-07-01,"Cabin, deposit",100.00,Bob,split between 2,50.00,50.00,0.00',
      "2026-07-02,Drinks,30.00,Alice,split between everyone (3),10.00,10.00,10.00",
      "Total,,130.00,,,60.00,60.00,10.00",
    ]);
  });

  it("escapes quotes and defuses spreadsheet formulas", () => {
    const event = makeEvent(["Alice"], {
      expenses: [{ ...expense("alice", 100), description: '=HYPERLINK("x")' }],
    });
    const row = expensesAsCsv(event).split("\r\n")[1];
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
