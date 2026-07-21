import type { Money } from "./types";

/**
 * Split `amount` into `n` parts that sum to exactly `amount`.
 * Remainder cents go to the earliest parts, so results are stable.
 */
export function splitEvenly(amount: Money, n: number): Money[] {
  if (n <= 0) return [];
  const base = Math.trunc(amount / n);
  const remainder = amount - base * n;
  const sign = remainder < 0 ? -1 : 1;
  const extra = Math.abs(remainder);
  return Array.from({ length: n }, (_, i) => base + (i < extra ? sign : 0));
}

/**
 * Split `amount` proportionally to `weights`, using the largest remainder
 * method so the parts sum to exactly `amount`. Ties break toward the earlier
 * key, so the same input always produces the same output.
 */
export function splitByShares(amount: Money, weights: number[]): Money[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (amount * w) / total);
  const floors = exact.map((v) => Math.floor(v));
  let leftover = amount - floors.reduce((a, b) => a + b, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const out = [...floors];
  for (let k = 0; leftover > 0; k++, leftover--) {
    out[order[k % order.length].i] += 1;
  }
  return out;
}

/** "1234" -> 1234 cents. Accepts "12.34", "12", "$12.34", "1,234.50". */
export function parseMoney(input: string): Money | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^-?\d*\.?\d{0,2}$/.test(cleaned) || cleaned === "" || cleaned === "-") {
    return null;
  }
  return Math.round(parseFloat(cleaned) * 100);
}

export function formatMoney(cents: Money, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
