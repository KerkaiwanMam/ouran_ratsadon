import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getRecommendations, recomputeRecommendations } from "@/lib/analytics/recommend";

// GET  /api/business/analytics/recommendations?status=PENDING
// POST /api/business/analytics/recommendations            — recompute from latest Tier 2/3 data
//
// Tier 4 — Prescriptive Analytics ("How can we make it happen / handle it?").
// A simple if-then rule engine (NOT an optimizer, NOT ML) that turns
// diagnostic insights + forecast snapshots into concrete next-best-action
// suggestions, with apply/dismiss feedback handled by the [id] route.
export async function GET(req: NextRequest) {
  // requireAuth — recomputeRecommendations inserts rows with the token's
  // userId; a stale JWT would trip their FK.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam === "PENDING" || statusParam === "APPLIED" || statusParam === "DISMISSED"
      ? statusParam
      : undefined;

  const recommendations = await getRecommendations(auth.userId, status);
  return NextResponse.json({ recommendations });
}

export async function POST(req: NextRequest) {
  // requireAuth — recomputeRecommendations inserts rows with the token's
  // userId; a stale JWT would trip their FK.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const created = await recomputeRecommendations(auth.userId);
  const recommendations = await getRecommendations(auth.userId);
  return NextResponse.json({ created, recommendations });
}
