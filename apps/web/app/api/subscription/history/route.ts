import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/subscription/history
// Returns payment records sorted newest first.
export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const records = await prisma.paymentRecord.findMany({
    where: { userId: payload.sub },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  return NextResponse.json({ records });
}
