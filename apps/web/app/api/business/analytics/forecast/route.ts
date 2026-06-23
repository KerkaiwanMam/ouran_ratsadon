import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recomputeForecastSnapshot, getLatestForecastSnapshot } from "@/lib/analytics/predict";
import { triggerRunwayAlert } from "@/lib/alert-triggers";

// GET  /api/business/analytics/forecast            — latest persisted snapshot
// POST /api/business/analytics/forecast            — recompute + persist a new snapshot
//
// Tier 3 — Predictive Analytics ("What will happen?"). Wraps the existing
// lib/forecaster.ts WMA + Seasonal Index engine (used by /api/business/forecast
// for the live curve) and persists a snapshot of the next-month prediction to
// ForecastSnapshot, so the dashboard and Tier 4 recommendations can read a
// stable record without recomputing every time. Per CLAUDE.md this stays a
// statistical method (never framed as AI/ML) — `method` and `inputWindow` are
// stored so the UI can always show exactly how the figure was produced.
// Pro-only, mirroring /api/business/forecast.

async function requirePro(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return !!(
    sub &&
    (sub.plan === "PRO" || sub.plan === "TEAM") &&
    (sub.status === "ACTIVE" || sub.status === "TRIAL")
  );
}

export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }
  if (!(await requirePro(payload.sub))) {
    return NextResponse.json(
      { error: "PLAN_REQUIRED", message: "ฟีเจอร์นี้สำหรับสมาชิก Pro ขึ้นไปเท่านั้น" },
      { status: 403 }
    );
  }

  const snapshot = await getLatestForecastSnapshot(payload.sub);
  return NextResponse.json({ snapshot });
}

export async function POST(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }
  if (!(await requirePro(payload.sub))) {
    return NextResponse.json(
      { error: "PLAN_REQUIRED", message: "ฟีเจอร์นี้สำหรับสมาชิก Pro ขึ้นไปเท่านั้น" },
      { status: 403 }
    );
  }

  let currentCash = 0;
  try {
    const body = await req.json();
    currentCash = typeof body?.currentCash === "number" ? body.currentCash : 0;
  } catch {
    // body optional
  }

  const { result, snapshotId } = await recomputeForecastSnapshot(payload.sub, currentCash);
  if (!snapshotId) {
    return NextResponse.json({
      snapshot: null,
      sufficiency: result.sufficiency,
      disclaimer: result.disclaimer,
    });
  }

  if (typeof result.runway === "number" && Number.isFinite(result.runway)) {
    try {
      await triggerRunwayAlert(payload.sub, Math.round(result.runway * 10) / 10);
    } catch (err) {
      console.error("runway alert trigger failed:", err);
    }
  }

  const snapshot = await getLatestForecastSnapshot(payload.sub);
  return NextResponse.json({ snapshot, disclaimer: result.disclaimer });
}
