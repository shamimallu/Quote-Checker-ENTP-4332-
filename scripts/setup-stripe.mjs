// Creates the "homi Premium" product and its two prices in Stripe (safe to run more than once).
// Run with: node scripts/setup-stripe.mjs
// Uses STRIPE_SECRET_KEY from .env.local. Prices are found later by lookup key, so no price IDs are needed.
import Stripe from "stripe";

process.loadEnvFile(".env.local");
const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("STRIPE_SECRET_KEY is empty in .env.local");
  process.exit(1);
}
const stripe = new Stripe(secretKey);

const PRICES = [
  { lookup_key: "homi_premium_monthly", unit_amount: 800, interval: "month" },
  { lookup_key: "homi_premium_yearly", unit_amount: 8000, interval: "year" },
];

const existing = await stripe.prices.list({
  lookup_keys: PRICES.map((p) => p.lookup_key),
  active: true,
});

let productId = existing.data[0]?.product;
if (!productId) {
  const product = await stripe.products.create({
    name: "homi Premium",
    description: "Job Files, Warranty Vault and Proof Log for your home.",
  });
  productId = product.id;
}

for (const price of PRICES) {
  if (existing.data.some((p) => p.lookup_key === price.lookup_key)) {
    console.log(`${price.lookup_key}: already exists`);
    continue;
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: price.unit_amount,
    recurring: { interval: price.interval },
    lookup_key: price.lookup_key,
  });
  console.log(`${price.lookup_key}: created ${created.id}`);
}
