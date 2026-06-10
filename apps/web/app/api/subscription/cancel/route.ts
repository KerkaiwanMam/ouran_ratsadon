import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// POST /api/subscription/cancel
// Cancels at end of current period (does not refund).
export async function POST(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: payload.sub } });
  if (!sub || sub.plan === "FREE") {
    return NextResponse.json(
      { error: "NO_ACTIVE_PLAN", message: "ไม่มีแผนที่ต้องยกเลิก" },
      { status: 400 }
    );
  }

  // Cancel on Stripe if subscription ID exists
  if (stripe && sub.stripeSubscriptionId) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  await prisma.subscription.update({
    where: { userId: payload.sub },
    data: { cancelAtPeriodEnd: true, status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true, message: "ยกเลิกสมาชิกเรียบร้อย — ยังใช้งานได้จนสิ้นรอบบิล" });
}
