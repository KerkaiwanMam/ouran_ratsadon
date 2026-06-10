import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/subscription — current user's subscription
export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: payload.sub },
  });

  if (!sub) {
    return NextResponse.json({ plan: "FREE", status: "ACTIVE" });
  }

  // Auto-expire trial
  let status = sub.status;
  if (status === "TRIAL" && sub.trialEndsAt && sub.trialEndsAt < new Date()) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { plan: "FREE", status: "ACTIVE" },
    });
    status = "ACTIVE";
    return NextResponse.json({ ...sub, plan: "FREE", status: "ACTIVE" });
  }

  return NextResponse.json(sub);
}
