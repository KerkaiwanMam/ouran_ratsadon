import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { getDescriptiveSummary } from "@/lib/analytics/summary";

// GET /api/business/analytics/summary?range=6
// Tier 1 — Descriptive Analytics ("What happened?"): pre-aggregated
// month × category rollups for dashboard charts/metrics. Reads from
// MonthlyFinancialSummary (derived/cached); recomputes lazily on first call.
export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const range = Math.min(24, Math.max(1, parseInt(searchParams.get("range") ?? "6", 10)));

  const summary = await getDescriptiveSummary(payload.sub, range);
  return NextResponse.json(summary);
}
