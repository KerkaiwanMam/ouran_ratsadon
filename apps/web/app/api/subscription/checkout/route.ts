import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe, getPriceId, type PlanKey, type BillingCycle } from "@/lib/stripe";

// POST /api/subscription/checkout
// Body: { plan: "PRO" | "TEAM", billing: "monthly" | "yearly" }
// Returns: { checkout_url: string }
export async function POST(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

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
      where: { userId: payload.sub },
      create: {
        userId: payload.sub,
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
    where: { id: payload.sub },
    select: { email: true, name: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบผู้ใช้งาน" },
      { status: 404 }
    );
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: payload.sub } });

  // Get or create Stripe customer
  let customerId = sub?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: payload.sub },
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
      metadata: { userId: payload.sub, plan },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: payload.sub, plan, billing },
    locale: "th",
  });

  // Store session ID so webhook can look up the user
  await prisma.subscription.upsert({
    where: { userId: payload.sub },
    create: {
      userId: payload.sub,
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
