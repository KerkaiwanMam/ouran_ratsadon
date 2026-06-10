import Stripe from "stripe";

// Stripe client — only instantiated when STRIPE_SECRET_KEY is present.
// When key is absent (local dev without Stripe), stripe is null and checkout
// routes fall back to a mock flow so the rest of the app keeps working.

export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" })
  : null;

// Price IDs for plans — configured in Stripe Dashboard
export const PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
  TEAM_MONTHLY: process.env.STRIPE_PRICE_TEAM_MONTHLY ?? "",
  TEAM_YEARLY: process.env.STRIPE_PRICE_TEAM_YEARLY ?? "",
} as const;

export type PlanKey = "PRO" | "TEAM";
export type BillingCycle = "monthly" | "yearly";

export function getPriceId(plan: PlanKey, billing: BillingCycle): string {
  if (plan === "PRO") return billing === "yearly" ? PRICE_IDS.PRO_YEARLY : PRICE_IDS.PRO_MONTHLY;
  return billing === "yearly" ? PRICE_IDS.TEAM_YEARLY : PRICE_IDS.TEAM_MONTHLY;
}
