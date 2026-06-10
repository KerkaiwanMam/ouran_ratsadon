import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { getRecommendations, recomputeRecommendations } from "@/lib/analytics/recommend";

// GET  /api/business/analytics/recommendations?status=PENDING
// POST /api/business/analytics/recommendations            — recompute from latest Tier 2/3 data
//
// Tier 4 — Prescriptive Analytics ("How can we make it happen / handle it?").
// A simple if-then rule engine (NOT an optimizer, NOT ML) that turns
// diagnostic insights + forecast snapshots into concrete next-best-action
// suggestions, with apply/dismiss feedback handled by the [id] route.
export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam === "PENDING" || statusParam === "APPLIED" || statusParam === "DISMISSED"
      ? statusParam
      : undefined;

  const recommendations = await getRecommendations(payload.sub, status);
  return NextResponse.json({ recommendations });
}

export async function POST(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const created = await recomputeRecommendations(payload.sub);
  const recommendations = await getRecommendations(payload.sub);
  return NextResponse.json({ created, recommendations });
}
