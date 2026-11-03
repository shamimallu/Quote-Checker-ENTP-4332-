import { NextResponse } from "next/server";
import { getStripe, isPremium, PAID_COOKIE, PAID_COOKIE_MAX_AGE, packPaidEmail, planEmail } from "@/lib/stripe";

// Tells the page whether this visitor has Premium. Works signed out too: right after paying,
// the page sends the Checkout session id and we remember the email Stripe confirmed.
export async function GET(request: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });

  try {
    const plan = await planEmail();
    const { signedIn } = plan;
    let { email } = plan;
    let newPaidEmail: string | null = null;

    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (sessionId?.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paid = session.status === "complete" && session.payment_status !== "unpaid";
      const paidEmail = session.customer_details?.email;
      if (paid && paidEmail) {
        newPaidEmail = paidEmail;
        email ??= paidEmail;
      }
    }

    const response = NextResponse.json({
      premium: email ? await isPremium(stripe, email) : false,
      signedIn,
    });
    if (newPaidEmail) {
      response.cookies.set(PAID_COOKIE, packPaidEmail(newPaidEmail), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: PAID_COOKIE_MAX_AGE,
        path: "/",
      });
    }
    return response;
  } catch (error) {
    console.error("Stripe status check failed:", error);
    return NextResponse.json({ error: "Could not check your plan. Try again." }, { status: 502 });
  }
}
