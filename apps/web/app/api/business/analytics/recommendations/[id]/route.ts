import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { setRecommendationStatus } from "@/lib/analytics/recommend";

// PATCH /api/business/analytics/recommendations/[id]   { status: "APPLIED" | "DISMISSED" }
//
// Tier 4 apply/dismiss feedback loop — lets the user act on or clear a
// suggested next-best-action. Ownership is checked inside setRecommendationStatus.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  let status: string | undefined;
  try {
    const body = await req.json();
    status = body?.status;
  } catch {
    // ignore — validated below
  }

  if (status !== "APPLIED" && status !== "DISMISSED") {
    return NextResponse.json(
      { error: "INVALID_STATUS", message: "สถานะต้องเป็น APPLIED หรือ DISMISSED" },
      { status: 400 }
    );
  }

  const ok = await setRecommendationStatus(payload.sub, id, status);
  if (!ok) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบคำแนะนำนี้" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, status });
}
