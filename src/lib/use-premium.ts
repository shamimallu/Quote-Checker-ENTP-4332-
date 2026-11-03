"use client";

import { useEffect, useState } from "react";

export type PlanStatus = "loading" | "signed-out" | "free" | "premium" | "unknown";

// Pass the Checkout session id right after paying so a visitor without an account is recognised too.
export function usePlanStatus(sessionId?: string): PlanStatus {
  const [status, setStatus] = useState<PlanStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
    fetch(`/api/stripe/status${query}`)
      .then(async (res): Promise<PlanStatus> => {
        if (!res.ok) return "unknown";
        const data = (await res.json()) as { premium?: boolean; signedIn?: boolean };
        if (data.premium) return "premium";
        return data.signedIn ? "free" : "signed-out";
      })
      .catch((): PlanStatus => "unknown")
      .then((next) => {
        if (!cancelled) setStatus(next);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return status;
}

// true = Premium, false = free plan, null = still checking, signed out or couldn't check.
// Callers should only lock things when this is exactly false, so a payments outage never locks people out.
export function usePremium() {
  const status = usePlanStatus();
  return status === "premium" ? true : status === "free" ? false : null;
}
