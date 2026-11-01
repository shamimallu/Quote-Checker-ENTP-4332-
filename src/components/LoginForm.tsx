"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

const LOGIN_ERRORS: Record<string, string> = {
  confirm: "That confirmation link did not work. Try signing in, or sign up again.",
  google: "Google sign-in didn't finish. Try again, or use your email and password.",
};

const inputClass =
  "w-full rounded-lg border border-walnut bg-espresso px-3 py-2 text-beige placeholder:text-sand/60 focus:border-caramel focus:outline-none";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(LOGIN_ERRORS[params.get("error") ?? ""] ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  const next = params.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  // Sends the person to Google, which returns them to /auth/callback and then to `destination`.
  async function signInWithGoogle() {
    setError(null);
    setNotice(null);
    setBusy(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
    // On success the browser is already leaving for Google, so only failures get here.
    if (error) {
      setError(LOGIN_ERRORS.google);
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "signup" && password.length < 8) {
      return setError("Use at least 8 characters for your password.");
    }
    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setError(error.message);
        router.replace(destination);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
          },
        });
        if (error) return setError(error.message);
        if (data.session) {
          router.replace(destination);
          router.refresh();
        } else {
          setNotice("Check your email for a confirmation link, then come back and sign in.");
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 self-center font-serif text-4xl text-beige">
        homi
      </Link>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-walnut bg-bark p-6">
        <h1 className="font-serif text-2xl text-beige">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="flex items-center justify-center gap-3 rounded-full border border-walnut bg-espresso px-4 py-2 text-sm text-beige transition-colors hover:border-caramel disabled:opacity-50"
        >
          <GoogleLogo />
          Sign in with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-sand" aria-hidden="true">
          <span className="h-px flex-1 bg-walnut" />
          or use your email
          <span className="h-px flex-1 bg-walnut" />
        </div>

        <label className="flex flex-col gap-1 text-sm text-sand">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-sand">
          Password
          <input
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {notice && <p className="text-sm text-caramel">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-full border border-caramel bg-caramel/10 px-4 py-2 text-sm text-caramel transition-colors hover:bg-caramel/20 disabled:opacity-50"
        >
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="text-sm text-sand underline hover:text-caramel"
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}

// Google's "G" mark, in its brand colors as Google's sign-in guidelines require.
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
