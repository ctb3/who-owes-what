"use client";

import { useMemo } from "react";
import { useEvent } from "./EventProvider";
import { personBalances } from "@/lib/balances";
import { newId, today } from "@/lib/ids";
import { formatMoney } from "@/lib/money";
import { partiesFor } from "@/lib/parties";
import { settleEvent } from "@/lib/settle";

export default function BalancesTab() {
  const { event, update } = useEvent();

  const transfers = useMemo(() => settleEvent(event), [event]);
  const perPerson = useMemo(() => personBalances(event), [event]);
  const parties = useMemo(() => partiesFor(event), [event]);

  const nameOfParty = (id: string) =>
    parties.find((p) => p.id === id)?.name ?? "someone";
  const money = (cents: number) => formatMoney(cents, event.currency);

  if (event.people.length === 0) {
    return <p className="text-sm text-muted">Add people first.</p>;
  }

  function settle(from: string, to: string, amount: number) {
    update((draft) => ({
      ...draft,
      payments: [...draft.payments, { id: newId(), from, to, amount, date: today() }],
    }));
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">
          Who owes who
        </h2>
        {transfers.length === 0 ? (
          <p className="card px-4 py-3 text-sm text-muted">Everyone is square.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {transfers.map((transfer) => (
              <li
                key={`${transfer.from}-${transfer.to}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="flex-1 min-w-0 text-sm">
                  <span className="font-medium">{nameOfParty(transfer.from)}</span> pays{" "}
                  <span className="font-medium">{nameOfParty(transfer.to)}</span>
                </span>
                <span className="shrink-0 tabular-nums font-medium">{money(transfer.amount)}</span>
                <button
                  type="button"
                  className="btn-ghost shrink-0 py-1 text-xs"
                  onClick={() => settle(transfer.from, transfer.to, transfer.amount)}
                >
                  Mark paid
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">
          Each person&rsquo;s share
        </h2>
        <ul className="card divide-y divide-line">
          {event.people.map((person) => {
            const balance = perPerson.find((b) => b.personId === person.id)!;
            return (
              <li key={person.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="flex-1 min-w-0 truncate">{person.name}</span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  paid {money(balance.paid)} · owes {money(balance.owed)}
                </span>
                <span
                  className={`w-24 shrink-0 text-right tabular-nums font-medium ${
                    balance.net > 0
                      ? "text-positive"
                      : balance.net < 0
                        ? "text-negative"
                        : "text-muted"
                  }`}
                >
                  {balance.net > 0 ? "+" : ""}
                  {money(balance.net)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {event.payments.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">
            Settle-ups recorded
          </h2>
          <ul className="card divide-y divide-line">
            {event.payments.map((payment) => (
              <li key={payment.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="flex-1 min-w-0">
                  {nameOfParty(payment.from)} paid {nameOfParty(payment.to)}
                  <span className="block text-xs text-muted">{payment.date}</span>
                </span>
                <span className="shrink-0 tabular-nums">{money(payment.amount)}</span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted hover:text-negative"
                  onClick={() =>
                    update((draft) => ({
                      ...draft,
                      payments: draft.payments.filter((p) => p.id !== payment.id),
                    }))
                  }
                >
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
