"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlanStatus } from "@/lib/use-premium";

type Plan = "monthly" | "yearly";

const FREE = ["Quote Checker: upload quotes and get AI assessments", "Missing scope, overpricing and quote comparisons"];
const PREMIUM = [
  "Everything in Standard",
  "Job Files: contracts, invoices and records for each job",
  "Warranty Vault with ending-soon alerts",
  "Proof Log for the work as it happens",
];

const PRICES: Record<Plan, { amount: string; per: string; note: string }> = {
  monthly: { amount: "$8", per: "month", note: "Cancel any time" },
  yearly: { amount: "$80", per: "year", note: "About 2 months free" },
};

async function goTo(path: string, body?: object) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong. Try again.");
  window.location.href = data.url;
}

export default function SubscribeApp({ status, sessionId }: { status?: string; sessionId?: string }) {
  const planStatus = usePlanStatus(sessionId);
  const premium = planStatus === "premium" ? true : planStatus === "free" ? false : null;
  const [plan, setPlan] = useState<Plan>("yearly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notice =
    status === "success"
      ? "Thanks! You now have homi Premium."
      : status === "cancelled"
        ? "Checkout cancelled. You have not been charged."
        : null;

  async function run(path: string, body?: object) {
    setBusy(true);
    setError(null);
    try {
      await goTo(path, body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  const price = PRICES[plan];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <h1 className="font-serif text-3xl text-beige">Plans</h1>
      <p className="mt-2 text-sand">Check quotes for free. Upgrade when you want to keep the paperwork for your home.</p>

      {notice && (
        <p role="status" className="mt-6 rounded-xl border border-caramel/50 bg-bark px-4 py-3 text-sm text-beige">
          {notice}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-walnut bg-bark p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-xl text-beige">Standard</h2>
            {(planStatus === "free" || planStatus === "signed-out") && (
              <span className="rounded-full border border-walnut px-3 py-0.5 text-xs text-sand">Your plan</span>
            )}
          </div>
          <p className="mt-1 text-3xl text-beige">$0</p>
          <ul className="mt-4 space-y-2 text-sm text-sand">
            {FREE.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-caramel bg-bark p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-xl text-beige">Premium</h2>
            {premium && (
              <span className="rounded-full bg-caramel px-3 py-0.5 text-xs text-espresso">Your plan</span>
            )}
          </div>
          <div className="mt-3 inline-flex rounded-full border border-walnut p-0.5 text-xs" role="group" aria-label="Billing period">
            {(["monthly", "yearly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                aria-pressed={plan === p}
                className={`rounded-full px-3 py-1 capitalize transition-colors ${
                  plan === p ? "bg-caramel text-espresso" : "text-sand hover:text-beige"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="mt-3 text-3xl text-beige">
            {price.amount}
            <span className="text-base text-sand"> / {price.per}</span>
          </p>
          <p className="text-xs text-sand">{price.note}</p>
          <ul className="mt-4 space-y-2 text-sm text-sand">
            {PREMIUM.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>

          {premium ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => run("/api/stripe/portal")}
              className="mt-6 w-full rounded-full border border-walnut px-5 py-2.5 text-sm text-beige transition-colors hover:border-caramel hover:text-caramel disabled:opacity-50"
            >
              {busy ? "Opening…" : "Manage subscription"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || planStatus === "loading"}
              onClick={() => run("/api/stripe/checkout", { plan })}
              className="mt-6 w-full rounded-full bg-caramel px-5 py-2.5 text-sm text-espresso shadow-md shadow-black/30 transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {busy ? "Opening checkout…" : "Upgrade to Premium"}
            </button>
          )}
          {planStatus === "signed-out" && (
            <p className="mt-3 text-xs text-sand">
              No account needed to pay. Use the same email when you{" "}
              <Link href="/login?next=%2Fsubscribe" className="text-caramel underline underline-offset-2">
                sign in
              </Link>{" "}
              and Premium unlocks.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {error}
            </p>
          )}
        </section>
      </div>

      <p className="mt-6 text-xs text-sand">Test mode: use card 4242 4242 4242 4242 with any future date and any CVC.</p>
    </main>
  );
}
