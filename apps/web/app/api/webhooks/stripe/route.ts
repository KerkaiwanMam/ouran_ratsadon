import { NextRequest, NextResponse } from "next/server";
import type { SubscriptionStatus } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import type Stripe from "stripe";

export const config = { api: { bodyParser: false } };

// POST /api/webhooks/stripe
// Stripe sends events here. Must verify signature using STRIPE_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", event.type, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const plan = (session.metadata?.plan as "PRO" | "TEAM") ?? "PRO";
  // Metadata is a plain string — map to Prisma's uppercase BillingCycle enum.
  const billingCycle = session.metadata?.billing === "yearly" ? ("YEARLY" as const) : ("MONTHLY" as const);
  const stripeSubId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan,
      status: "TRIAL",
      billingCycle,
      trialEndsAt: trialEnd,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
      stripeSubscriptionId: stripeSubId,
    },
    update: {
      plan,
      status: "TRIAL",
      billingCycle,
      trialEndsAt: trialEnd,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
      stripeSubscriptionId: stripeSubId,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const sub = await prisma.subscription.findUnique({ where: { stripeCustomerId: customerId } });
  if (!sub) return;

  const periodEnd = invoice.lines.data[0]?.period?.end;
  const periodStart = invoice.lines.data[0]?.period?.start;

  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      status: "ACTIVE",
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : undefined,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
      cancelAtPeriodEnd: false,
    },
  });

  // Record payment
  if (invoice.amount_paid > 0) {
    const existingRecord = invoice.id
      ? await prisma.paymentRecord.findUnique({ where: { stripeInvoiceId: invoice.id } })
      : null;

    if (!existingRecord) {
      await prisma.paymentRecord.create({
        data: {
          userId: sub.userId,
          subscriptionId: sub.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: "paid",
          description: invoice.lines.data[0]?.description ?? `${sub.plan} subscription`,
          stripeInvoiceId: invoice.id ?? undefined,
          paidAt: invoice.status_transitions?.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : new Date(),
        },
      });
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: { status: "PAST_DUE" },
  });

  // Record failed payment
  const sub = await prisma.subscription.findUnique({ where: { stripeCustomerId: customerId } });
  if (sub && invoice.amount_due > 0) {
    await prisma.paymentRecord.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: "failed",
        description: "Payment failed",
        stripeInvoiceId: invoice.id ?? undefined,
      },
    });
  }
}

async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSub.id },
  });
  if (!existing) return;

  const statusMap: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    trialing: "TRIAL",
    past_due: "PAST_DUE",
    canceled: "CANCELLED",
    unpaid: "PAST_DUE",
    paused: "ACTIVE",
  };

  // current_period_start/end moved to item level in newer Stripe API versions
  const firstItem = stripeSub.items?.data?.[0];
  const periodStart = (firstItem as { current_period_start?: number })?.current_period_start
    ?? (stripeSub as unknown as { current_period_start?: number }).current_period_start;
  const periodEnd = (firstItem as { current_period_end?: number })?.current_period_end
    ?? (stripeSub as unknown as { current_period_end?: number }).current_period_end;

  await prisma.subscription.update({
    where: { stripeSubscriptionId: stripeSub.id },
    data: {
      status: statusMap[stripeSub.status] ?? "ACTIVE",
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : undefined,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
    },
  });
}

async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: stripeSub.id },
    data: {
      plan: "FREE",
      status: "ACTIVE",
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
    },
  });
}
