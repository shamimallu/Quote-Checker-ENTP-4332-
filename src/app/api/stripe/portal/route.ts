import { NextResponse } from "next/server";
import { findCustomer, getStripe, planEmail } from "@/lib/stripe";

// Opens Stripe's page where a subscriber can cancel, switch plan or update their card.
export async function POST(request: Request) {
  const { email } = await planEmail();
  if (!email) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });

  try {
    const customer = await findCustomer(stripe, email);
    if (!customer) return NextResponse.json({ error: "No subscription found." }, { status: 404 });

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${new URL(request.url).origin}/subscribe`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal failed:", error);
    return NextResponse.json({ error: "Could not open billing. Try again." }, { status: 502 });
  }
}
