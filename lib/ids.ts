/** Ids for people, expenses, and payments. Only unique within an event. */
export function newId(): string {
  return globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
