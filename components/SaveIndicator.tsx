"use client";

import { useEvent } from "./EventProvider";

export default function SaveIndicator() {
  const { saveState, retry } = useEvent();

  if (saveState === "idle") return null;

  if (saveState === "error") {
    return (
      <button type="button" onClick={() => void retry()} className="text-xs text-negative underline">
        Save failed — retry
      </button>
    );
  }

  return (
    <span className="text-xs text-muted">{saveState === "saving" ? "Saving…" : "Saved"}</span>
  );
}
