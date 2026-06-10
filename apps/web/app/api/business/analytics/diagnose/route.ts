import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { getDiagnosticInsights } from "@/lib/analytics/diagnose";

// GET /api/business/analytics/diagnose?limit=20
// Tier 2 — Diagnostic Analytics ("Why did it happen?"): plain-language
// explanations (z-score based category spikes/drops, new vendor surges)
// pointing back at the transactions that drove them. Reads from
// DiagnosticInsight (derived/cached); recomputes lazily on first call.
export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  const insights = await getDiagnosticInsights(payload.sub, limit);
  return NextResponse.json({ insights });
}
