import type { ExtractedQuote } from "@/lib/quote-types";

// Client-only: do not call these during server rendering.
const STORAGE_KEY = "homi.quoteChecker.quotes";

export function loadQuotes(): ExtractedQuote[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExtractedQuote[]) : [];
  } catch {
    return [];
  }
}

export function saveQuotes(quotes: ExtractedQuote[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  } catch {
    // Ignore storage errors (e.g. private browsing) — quotes just won't persist.
  }
}
