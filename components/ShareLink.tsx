"use client";

import { useState, useSyncExternalStore } from "react";

const noop = () => () => {};

export default function ShareLink() {
  // Rendered blank on the server, filled in on hydration.
  const url = useSyncExternalStore(
    noop,
    () => window.location.href,
    () => "",
  );
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
      <input readOnly value={url} className="flex-1 min-w-0 bg-transparent text-xs text-muted" />
      <button
        type="button"
        className="btn-ghost py-1 text-xs"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
