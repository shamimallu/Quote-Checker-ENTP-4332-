import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

// Server only: uses STRIPE_SECRET_KEY, which must never have a NEXT_PUBLIC_ prefix.
export const PLANS = {
  monthly: "homi_premium_monthly",
  yearly: "homi_premium_yearly",
} as const;
export type Plan = keyof typeof PLANS;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

// The signed-in person's email, or null when signed out.
export async function currentEmail() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

// After paying without an account, we remember the email Stripe confirmed in a signed cookie,
// so the plans page can show "Premium" and the billing portal can open. Signed with the Stripe
// secret key so nobody can forge it.
export const PAID_COOKIE = "homi_paid_email";
export const PAID_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function sign(email: string) {
  return createHmac("sha256", process.env.STRIPE_SECRET_KEY ?? "").update(email).digest("base64url");
}

export function packPaidEmail(email: string) {
  return `${Buffer.from(email).toString("base64url")}.${sign(email)}`;
}

function unpackPaidEmail(value: string | undefined) {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const email = Buffer.from(encoded, "base64url").toString();
  const expected = Buffer.from(sign(email));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? email : null;
}

// Signed-in email first, otherwise the email from a verified payment on this browser.
export async function planEmail() {
  const signedIn = await currentEmail();
  if (signedIn) return { email: signedIn, signedIn: true };
  const cookieStore = await cookies();
  const paid = unpackPaidEmail(cookieStore.get(PAID_COOKIE)?.value);
  return { email: paid, signedIn: false };
}

export async function findCustomer(stripe: Stripe, email: string) {
  const { data } = await stripe.customers.list({ email, limit: 1 });
  return data[0] ?? null;
}

// Premium means an active (or trialing) subscription on the Stripe customer with this email.
// Stripe is the source of truth, so no database change is needed.
export async function isPremium(stripe: Stripe, email: string) {
  const customer = await findCustomer(stripe, email);
  if (!customer) return false;
  const { data } = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 10 });
  return data.some((s) => s.status === "active" || s.status === "trialing");
}
