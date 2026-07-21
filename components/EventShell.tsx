"use client";

import Link from "next/link";
import { useState } from "react";
import BalancesTab from "./BalancesTab";
import { EventProvider, useEvent } from "./EventProvider";
import ExpensesTab from "./ExpensesTab";
import PeopleTab from "./PeopleTab";
import SaveIndicator from "./SaveIndicator";
import ShareLink from "./ShareLink";
import type { EventDoc } from "@/lib/types";

const TABS = ["Expenses", "People", "Balances"] as const;
type Tab = (typeof TABS)[number];

export default function EventShell({ initial }: { initial: EventDoc }) {
  return (
    <EventProvider initial={initial}>
      <Inner />
    </EventProvider>
  );
}

function Inner() {
  const { event } = useEvent();
  const [tab, setTab] = useState<Tab>("Expenses");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6">
        <Link href="/" className="text-xs text-muted hover:text-foreground">
          ← All events
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          <SaveIndicator />
        </div>
        <ShareLink />
      </header>

      <nav className="mb-5 flex gap-1 rounded-lg border border-line bg-surface p-1">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === name ? "bg-accent text-white" : "hover:bg-background"
            }`}
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === "Expenses" && <ExpensesTab />}
      {tab === "People" && <PeopleTab />}
      {tab === "Balances" && <BalancesTab />}
    </main>
  );
}
