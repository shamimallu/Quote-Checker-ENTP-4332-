"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GeminiChatMessage } from "@/lib/gemini";
import type { ComparisonResult, ExtractedQuote } from "@/lib/quote-types";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;

function SparkleIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3.5 13.8 9a1.5 1.5 0 0 0 1 1l5.7 1.9-5.7 1.9a1.5 1.5 0 0 0-1 1L12 20.5l-1.8-5.7a1.5 1.5 0 0 0-1-1L3.5 12l5.7-1.9a1.5 1.5 0 0 0 1-1z" />
      <path d="M19 3v3M17.5 4.5h3" />
    </svg>
  );
}

// Floating "Ask Gemini" button that opens a chat. Pass the quotes on screen so
// Gemini can answer questions about them. The chat is cleared on refresh.
export default function GeminiButton({
  quotes,
  comparison,
}: {
  quotes?: ExtractedQuote[];
  comparison?: ComparisonResult | null;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<GeminiChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The chat needs an account (the API route is for signed-in people), but the home page doesn't.
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  const pathname = usePathname();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Bumped on sign-out so a reply that arrives afterwards isn't shown.
  const conversationRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));

    // Signing out (here or in another tab) clears the chat, so the next person at this
    // computer can't read it.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        conversationRef.current++;
        setMessages([]);
        setDraft("");
        setError(null);
        setSending(false);
        setSignedIn(false);
      } else if (session) {
        setSignedIn(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages, sending, error]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const full = messages.length >= MAX_MESSAGES - 1;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || full) return;

    const conversation = conversationRef.current;
    const next: GeminiChatMessage[] = [...messages, { role: "user", text }];
    setMessages(next);
    setDraft("");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/ask-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, quotes, comparison }),
      });
      const data = await res.json();
      if (conversation !== conversationRef.current) return; // signed out while waiting
      if (!res.ok) throw new Error(data.error ?? "Could not reach Gemini.");
      setMessages([...next, { role: "model", text: data.reply }]);
    } catch (e) {
      if (conversation !== conversationRef.current) return;
      // Put the question back so it can be sent again.
      setMessages(messages);
      setDraft(text);
      setError(e instanceof Error && e.message ? e.message : "Could not reach Gemini.");
    } finally {
      if (conversation === conversationRef.current) setSending(false);
    }
  }

  if (!open) {
    return (
      <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex items-center gap-3 sm:right-6 sm:bottom-6">
        <p className="relative rounded-2xl border border-walnut bg-bark px-3.5 py-2 text-xs leading-snug text-beige shadow-lg shadow-black/30 sm:text-sm">
          {/* breaks after the question on phones, one line on wider screens */}
          Not sure about a quote? <span className="block sm:inline">Ask Gemini.</span>
          {/* tail pointing at the button */}
          <span
            aria-hidden="true"
            className="absolute top-1/2 -right-[5px] h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-t border-r border-walnut bg-bark"
          />
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask Gemini, the AI assistant"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-caramel text-espresso shadow-lg shadow-black/40 ring-1 ring-caramel/40 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beige"
        >
          <SparkleIcon className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Ask Gemini"
      onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex max-h-[min(36rem,calc(100dvh-2rem))] w-[calc(100vw-2rem)] flex-col rounded-2xl border border-walnut bg-bark shadow-lg shadow-black/40 sm:right-6 sm:bottom-6 sm:w-96"
    >
      <header className="flex items-center justify-between gap-3 border-b border-walnut px-4 py-3">
        <h2 className="flex items-center gap-2 font-serif text-lg text-beige">
          <SparkleIcon className="h-4 w-4 text-caramel" />
          Ask Gemini
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="rounded-full px-2 py-1 text-sm text-sand transition-colors hover:text-beige focus-visible:outline-2 focus-visible:outline-caramel"
        >
          ✕
        </button>
      </header>

      <div className="flex min-h-40 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {signedIn === false && (
          <p className="text-sm text-sand">
            Sign in to ask Gemini about your quotes.{" "}
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="text-caramel underline hover:text-beige"
            >
              Sign in
            </Link>
          </p>
        )}
        {signedIn !== false && messages.length === 0 && (
          <p className="text-sm text-sand">
            {quotes?.length
              ? "Ask about the quotes on this page, like “Is this deposit too high?”"
              : "Ask about a repair quote, like “What should a roof quote include?”"}
          </p>
        )}
        {messages.map((message, index) => (
          <p
            key={index}
            className={
              message.role === "user"
                ? "max-w-[85%] self-end rounded-2xl bg-caramel px-3 py-2 text-sm whitespace-pre-wrap text-espresso"
                : "max-w-[85%] self-start rounded-2xl bg-walnut px-3 py-2 text-sm whitespace-pre-wrap text-beige"
            }
          >
            {message.text}
          </p>
        ))}
        {sending && <p className="self-start text-sm text-sand">Gemini is thinking…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {full && <p className="text-sm text-sand">This chat is full. Refresh the page to start a new one.</p>}
        <div ref={endRef} />
      </div>

      {signedIn !== false && (
        <form onSubmit={handleSubmit} className="border-t border-walnut p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) handleSubmit(event);
              }}
              rows={2}
              maxLength={MAX_MESSAGE_CHARS}
              placeholder="Type your question"
              aria-label="Your question"
              className="min-w-0 flex-1 resize-none rounded-xl border border-walnut bg-espresso px-3 py-2 text-sm text-beige placeholder:text-sand focus:border-caramel focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || full || !draft.trim()}
              className="rounded-full bg-caramel px-4 py-2 text-sm text-espresso transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-xs text-sand">
            Answers come from Google Gemini and can be wrong. Don&apos;t share personal details.
          </p>
        </form>
      )}
    </section>
  );
}
