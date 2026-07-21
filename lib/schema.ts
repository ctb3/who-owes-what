import { z } from "zod";

const id = z.string().min(1).max(64);
const money = z.int().min(-100_000_000).max(100_000_000);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const personSchema = z.object({
  id,
  name: z.string().min(1).max(80),
});

export const coupleSchema = z.object({
  id,
  name: z.string().max(80).optional(),
  memberIds: z.tuple([id, id]),
});

export const splitSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("all") }),
  z.object({ mode: z.literal("equal"), personIds: z.array(id).max(200) }),
  z.object({ mode: z.literal("shares"), shares: z.record(id, z.number().min(0).max(1000)) }),
  z.object({ mode: z.literal("exact"), amounts: z.record(id, money) }),
]);

export const expenseSchema = z
  .object({
    id,
    description: z.string().max(200),
    amount: money,
    paidBy: id,
    date,
    split: splitSchema,
  })
  .refine(
    (e) =>
      e.split.mode !== "exact" ||
      Object.values(e.split.amounts).reduce((a, b) => a + b, 0) === e.amount,
    { message: "Exact split amounts must add up to the expense total", path: ["split"] },
  );

export const paymentSchema = z.object({
  id,
  from: id,
  to: id,
  amount: money,
  date,
  note: z.string().max(200).optional(),
});

export const eventDocSchema = z.object({
  id,
  name: z.string().min(1).max(120),
  currency: z.string().length(3),
  people: z.array(personSchema).max(200),
  couples: z.array(coupleSchema).max(100),
  expenses: z.array(expenseSchema).max(2000),
  payments: z.array(paymentSchema).max(2000),
  version: z.int().min(0),
});

export const createEventSchema = z.object({
  name: z.string().min(1).max(120),
  currency: z.string().length(3).default("USD"),
  passphrase: z.string().min(4).max(200).optional(),
});

export const unlockSchema = z.object({
  passphrase: z.string().min(1).max(200),
});

/** The client sends the whole doc; the id always comes from the URL. */
export const putEventSchema = eventDocSchema.omit({ id: true });
