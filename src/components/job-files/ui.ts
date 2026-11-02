"use client";

import { useState } from "react";

// Shared styles for the Job Files sections, from the homi palette.
export const card = "rounded-2xl border border-walnut bg-bark p-6";
export const sectionTitle = "font-serif text-xl text-beige";
export const input =
  "rounded-lg border border-walnut bg-espresso px-3 py-2 text-sm text-beige placeholder:text-sand/50 focus:border-caramel focus:outline-none [color-scheme:dark]";
export const pill =
  "rounded-full border border-walnut px-4 py-1.5 text-sm text-beige transition-colors hover:border-caramel hover:text-caramel disabled:opacity-50";
export const primaryPill =
  "rounded-full border border-caramel bg-caramel/10 px-4 py-1.5 text-sm text-caramel transition-colors hover:bg-caramel/20 disabled:opacity-50";
export const linkButton = "text-xs text-sand transition-colors hover:text-red-400 disabled:opacity-50";

// Runs a save or delete, tracking "busy" and showing the error's own message if it has one.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>, failure: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : failure);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setError, run };
}
