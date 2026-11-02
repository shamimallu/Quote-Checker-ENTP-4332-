"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SIGNED_OUT_NOTICE_MS = 5000;

// Small sign in / sign out control for the home page.
export default function AuthStatus() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [signingOut, setSigningOut] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  // Hide the "signed out" message after a few seconds.
  useEffect(() => {
    if (!signedOut) return;
    const timer = setTimeout(() => setSignedOut(false), SIGNED_OUT_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [signedOut]);

  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    setSigningOut(false);
    setEmail(null);
    setSignedOut(true);
    router.refresh();
  }

  const pill =
    "rounded-full border border-walnut px-4 py-1.5 text-sm text-beige transition-colors hover:border-caramel hover:text-caramel disabled:opacity-50";

  return (
    <>
      <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
        {email === undefined ? null : email ? (
          <>
            <span className="hidden text-sm text-sand sm:inline">{email}</span>
            <button type="button" onClick={signOut} disabled={signingOut} className={pill}>
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <Link href="/login" className={pill}>
            Sign in
          </Link>
        )}
      </div>

      {/* Announced to screen readers too. Sits below the top-right button so it never covers it. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4"
      >
        {signedOut && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-caramel/50 bg-bark px-4 py-2 text-sm text-beige shadow-lg shadow-black/40">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-caramel"
            >
              <path d="m5 12 5 5L20 7" />
            </svg>
            You&apos;ve signed out. See you next time.
            <button
              type="button"
              onClick={() => setSignedOut(false)}
              aria-label="Dismiss"
              className="text-sand transition-colors hover:text-caramel"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </>
  );
}
