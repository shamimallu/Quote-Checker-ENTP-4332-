import { NextResponse } from "next/server";
import { currentEmail, findCustomer, getStripe, isPremium, PLANS, type Plan } from "@/lib/stripe";

// Starts a Stripe Checkout subscription and returns the page to send the person to.
export async function POST(request: Request) {
  // Signing in is optional: signed-out visitors give their email at checkout, and Premium
  // unlocks when they later sign in with that same email.
  const email = await currentEmail();

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });

  let plan: Plan | undefined;
  try {
    const body = (await request.json()) as { plan?: string };
    if (body.plan === "monthly" || body.plan === "yearly") plan = body.plan;
  } catch {
    // handled below
  }
  if (!plan) return NextResponse.json({ error: "Pick monthly or yearly." }, { status: 400 });

  try {
    if (email && (await isPremium(stripe, email))) {
      return NextResponse.json({ error: "You already have Premium." }, { status: 409 });
    }

    const prices = await stripe.prices.list({ lookup_keys: [PLANS[plan]], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) {
      return NextResponse.json(
        { error: "Premium prices are not set up yet. Run: node scripts/setup-stripe.mjs" },
        { status: 503 }
      );
    }

    const customer = email
      ? ((await findCustomer(stripe, email)) ?? (await stripe.customers.create({ email })))
      : null;
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(customer ? { customer: customer.id } : {}),
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/subscribe?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe?status=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed:", error);
    return NextResponse.json({ error: "Could not start checkout. Try again." }, { status: 502 });
  }
}
