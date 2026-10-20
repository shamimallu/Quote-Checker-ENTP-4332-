"use client";

import { useEffect, useState } from "react";

const COMING_SOON = "Muse is coming soon.";

// Floating launcher for Muse, the AI assistant. Pass `onOpen` to connect the
// real assistant; until then, clicking shows a short "coming soon" message.
export default function MuseButton({ onOpen }: { onOpen?: () => void }) {
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    if (!showComingSoon) return;
    const timer = setTimeout(() => setShowComingSoon(false), 2500);
    return () => clearTimeout(timer);
  }, [showComingSoon]);

  function handleClick() {
    if (onOpen) onOpen();
    else setShowComingSoon(true);
  }

  return (
    <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex items-center gap-3 sm:right-6 sm:bottom-6">
      <p
        aria-live="polite"
        className="relative rounded-2xl border border-walnut bg-bark px-3.5 py-2 text-xs leading-snug text-beige shadow-lg shadow-black/30 sm:text-sm"
      >
        {showComingSoon ? (
          COMING_SOON
        ) : (
          <>
            {/* breaks after the question on phones, one line on wider screens */}
            Not sure about a quote? <span className="block sm:inline">Ask Muse.</span>
          </>
        )}
        {/* tail pointing at the button */}
        <span
          aria-hidden="true"
          className="absolute top-1/2 -right-[5px] h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-t border-r border-walnut bg-bark"
        />
      </p>

      <button
        type="button"
        onClick={handleClick}
        aria-label="Ask Muse, the AI assistant"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-caramel text-espresso shadow-lg shadow-black/40 ring-1 ring-caramel/40 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beige"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-6 w-6"
        >
          <path d="M12 3.5 13.8 9a1.5 1.5 0 0 0 1 1l5.7 1.9-5.7 1.9a1.5 1.5 0 0 0-1 1L12 20.5l-1.8-5.7a1.5 1.5 0 0 0-1-1L3.5 12l5.7-1.9a1.5 1.5 0 0 0 1-1z" />
          <path d="M19 3v3M17.5 4.5h3" />
        </svg>
      </button>
    </div>
  );
}
