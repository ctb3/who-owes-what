import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney, splitByShares, splitEvenly } from "../money";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("splitEvenly", () => {
  it("splits $10 three ways without losing a penny", () => {
    const parts = splitEvenly(1000, 3);
    expect(parts).toEqual([334, 333, 333]);
    expect(sum(parts)).toBe(1000);
  });

  it("splits evenly when it divides cleanly", () => {
    expect(splitEvenly(1000, 4)).toEqual([250, 250, 250, 250]);
  });

  it("always sums to the original amount", () => {
    for (let amount = 0; amount < 500; amount += 7) {
      for (let n = 1; n <= 9; n++) {
        expect(sum(splitEvenly(amount, n))).toBe(amount);
      }
    }
  });

  it("handles negative amounts", () => {
    const parts = splitEvenly(-1000, 3);
    expect(sum(parts)).toBe(-1000);
  });

  it("returns nothing for zero participants", () => {
    expect(splitEvenly(1000, 0)).toEqual([]);
  });
});

describe("splitByShares", () => {
  it("weights proportionally", () => {
    expect(splitByShares(1000, [1, 1, 2])).toEqual([250, 250, 500]);
  });

  it("gives leftover cents to the largest remainder", () => {
    const parts = splitByShares(1000, [1, 1, 1]);
    expect(sum(parts)).toBe(1000);
    expect(parts).toEqual([334, 333, 333]);
  });

  it("always sums to the original amount", () => {
    for (let amount = 0; amount < 500; amount += 13) {
      expect(sum(splitByShares(amount, [3, 1, 1, 2]))).toBe(amount);
    }
  });

  it("returns zeros when all weights are zero", () => {
    expect(splitByShares(1000, [0, 0])).toEqual([0, 0]);
  });
});

describe("parseMoney", () => {
  it("parses common shapes", () => {
    expect(parseMoney("12.34")).toBe(1234);
    expect(parseMoney("12")).toBe(1200);
    expect(parseMoney("$1,234.50")).toBe(123450);
    expect(parseMoney(".5")).toBe(50);
  });

  it("rejects junk", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("1.234")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("renders cents as currency", () => {
    expect(formatMoney(123450)).toBe("$1,234.50");
  });
});
