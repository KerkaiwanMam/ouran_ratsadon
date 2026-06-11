import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { stripe, getPriceId, type PlanKey, type BillingCycle } from "@/lib/stripe";

// POST /api/subscription/checkout
// Body: { plan: "PRO" | "TEAM", billing: "monthly" | "yearly" }
// Returns: { checkout_url: string }
export async function POST(req: NextRequest) {
  // requireAuth — the mock (no-Stripe) flow upserts a Subscription with the
  // token's userId before any user lookup; a stale JWT would trip its FK.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const body = await req.json().catch(() => null);
  const plan = body?.plan as PlanKey;
  // Normalize instead of blind-casting — anything other than "yearly" is monthly.
  const billing: BillingCycle = body?.billing === "yearly" ? "yearly" : "monthly";
  // Prisma's BillingCycle enum is uppercase; lib/stripe's is lowercase.
  const billingCycle = billing === "yearly" ? ("YEARLY" as const) : ("MONTHLY" as const);

  if (!["PRO", "TEAM"].includes(plan)) {
    return NextResponse.json(
      { error: "INVALID_PLAN", message: "แผนไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const successUrl = `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/upgrade`;

  // Mock flow when Stripe is not configured
  if (!stripe) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    await prisma.subscription.upsert({
      where: { userId: auth.userId },
      create: {
        userId: auth.userId,
        plan,
        status: "TRIAL",
        billingCycle,
        trialEndsAt: trialEnd,
      },
      update: {
        plan,
        status: "TRIAL",
        billingCycle,
        trialEndsAt: trialEnd,
      },
    });
    return NextResponse.json({
      checkout_url: `${appUrl}/subscription/success?mock=true&plan=${plan}`,
    });
  }

  // Real Stripe checkout
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { email: true, name: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบผู้ใช้งาน" },
      { status: 404 }
    );
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: auth.userId } });

  // Get or create Stripe customer
  let customerId = sub?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: auth.userId },
    });
    customerId = customer.id;
  }

  const priceId = getPriceId(plan, billing);
  if (!priceId) {
    return NextResponse.json(
      { error: "PRICE_NOT_CONFIGURED", message: "ยังไม่ได้ตั้งค่า Price ID ใน Stripe Dashboard" },
      { status: 503 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId: auth.userId, plan },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: auth.userId, plan, billing },
    locale: "th",
  });

  // Store session ID so webhook can look up the user
  await prisma.subscription.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      plan: "FREE",
      status: "ACTIVE",
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: session.id,
    },
    update: {
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: session.id,
    },
  });

  return NextResponse.json({ checkout_url: session.url });
}
