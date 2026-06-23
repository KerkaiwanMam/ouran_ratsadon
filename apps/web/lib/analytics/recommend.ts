// Tier 4 — Prescriptive Analytics ("How can we make it happen / handle it?")
// Spec: docs/analytics-module-spec.md §5 Recommendation
//
// A simple if-then rule engine — explicitly NOT an optimization solver and
// NOT ML — that turns Tier 2 (DiagnosticInsight) and Tier 3 (ForecastSnapshot)
// outputs into concrete, Thai-language "next-best-action" suggestions with a
// lightweight apply/dismiss feedback loop (status: PENDING/APPLIED/DISMISSED).

import { prisma } from "@/lib/db";

export interface RecommendationCandidate {
  basedOn: "forecast" | "leak" | "diagnostic";
  basedOnId: string;
  action: string;
  priority: "high" | "medium" | "low";
}

/**
 * Pure rule application — given the latest diagnostic insights and forecast
 * snapshot, derive recommendation candidates. Exported for tests.
 *
 * Rules:
 *  1. Low cash runway (<3 months) from the forecast → high-priority "ลดรายจ่าย/หาแหล่งเงินทุน"
 *  2. Negative predicted net for next month → medium-priority "ทบทวนแผนรายจ่ายเดือนหน้า"
 *  3. category_spike diagnostic → high-priority "ตรวจสอบและพิจารณาลดงบหมวดนี้"
 *  4. new_vendor_surge diagnostic → medium-priority "ตรวจสอบผู้ให้บริการ/รายการใหม่"
 *  5. seasonal_drop diagnostic → low-priority "ติดตามแนวโน้มหมวดนี้ต่อเนื่อง" (informational)
 */
export function buildRecommendationCandidates(
  diagnostics: { id: string; category: string; insightType: string }[],
  forecastSnapshot: {
    id: string;
    forecastMonth: string;
    predictedNet: number;
    cashRunwayMonths: number | null;
  } | null
): RecommendationCandidate[] {
  const candidates: RecommendationCandidate[] = [];

  if (forecastSnapshot) {
    if (forecastSnapshot.cashRunwayMonths !== null && forecastSnapshot.cashRunwayMonths < 3) {
      candidates.push({
        basedOn: "forecast",
        basedOnId: forecastSnapshot.id,
        action: `กระแสเงินสดคาดว่าจะอยู่ได้อีกประมาณ ${forecastSnapshot.cashRunwayMonths} เดือนเท่านั้น — ควรลดรายจ่ายที่ไม่จำเป็นหรือมองหาแหล่งเงินทุนเพิ่มเติมโดยเร็ว`,
        priority: "high",
      });
    } else if (forecastSnapshot.predictedNet < 0) {
      candidates.push({
        basedOn: "forecast",
        basedOnId: forecastSnapshot.id,
        action: `คาดการณ์ว่าเดือน ${forecastSnapshot.forecastMonth} กระแสเงินสดสุทธิจะติดลบ — ควรทบทวนแผนรายรับ-รายจ่ายล่วงหน้า`,
        priority: "medium",
      });
    }
  }

  for (const d of diagnostics) {
    if (d.insightType === "category_spike") {
      candidates.push({
        basedOn: "diagnostic",
        basedOnId: d.id,
        action: `ตรวจสอบรายการในหมวด "${d.category}" ที่พุ่งสูงผิดปกติ และพิจารณาวางงบประมาณ (budget) ควบคุมหมวดนี้ในเดือนถัดไป`,
        priority: "high",
      });
    } else if (d.insightType === "new_vendor_surge") {
      candidates.push({
        basedOn: "diagnostic",
        basedOnId: d.id,
        action: `ตรวจสอบผู้ให้บริการ/รายการใหม่ในหมวด "${d.category}" ว่าถูกต้องตามที่คาดไว้หรือไม่ ก่อนที่จะกลายเป็นค่าใช้จ่ายประจำ`,
        priority: "medium",
      });
    } else if (d.insightType === "seasonal_drop") {
      candidates.push({
        basedOn: "diagnostic",
        basedOnId: d.id,
        action: `ติดตามแนวโน้มหมวด "${d.category}" ต่อเนื่อง — ค่าใช้จ่ายลดลงผิดปกติ อาจเป็นความผันผวนตามฤดูกาลหรือรายการที่หายไปโดยไม่ตั้งใจ`,
        priority: "low",
      });
    }
  }

  return candidates;
}

/**
 * Recompute and persist PENDING recommendations from the user's latest
 * diagnostic insights + forecast snapshot. Skips any (basedOn, basedOnId)
 * pair that already has a recommendation (regardless of status), so applied/
 * dismissed feedback isn't overwritten and duplicates aren't created.
 */
export async function recomputeRecommendations(userId: string): Promise<number> {
  const latestInsightMonth = await prisma.diagnosticInsight.findFirst({
    where: { userId },
    orderBy: { month: "desc" },
    select: { month: true },
  });

  const diagnostics = latestInsightMonth
    ? await prisma.diagnosticInsight.findMany({
        where: { userId, month: latestInsightMonth.month },
        select: { id: true, category: true, insightType: true },
      })
    : [];

  const forecastSnapshot = await prisma.forecastSnapshot.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
    select: { id: true, forecastMonth: true, predictedNet: true, cashRunwayMonths: true },
  });

  // ForecastSnapshot.predictedNet and cashRunwayMonths are Prisma.Decimal;
  // coerce to number so buildRecommendationCandidates gets plain JS numbers.
  const forecastView = forecastSnapshot
    ? {
        id: forecastSnapshot.id,
        forecastMonth: forecastSnapshot.forecastMonth,
        predictedNet: Number(forecastSnapshot.predictedNet),
        cashRunwayMonths:
          forecastSnapshot.cashRunwayMonths != null
            ? Number(forecastSnapshot.cashRunwayMonths)
            : null,
      }
    : null;

  const candidates = buildRecommendationCandidates(diagnostics, forecastView);
  if (candidates.length === 0) return 0;

  const existing = await prisma.recommendation.findMany({
    where: { userId },
    select: { basedOn: true, basedOnId: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.basedOn}|${e.basedOnId}`));

  const fresh = candidates.filter((c) => !existingKeys.has(`${c.basedOn}|${c.basedOnId}`));
  if (fresh.length === 0) return 0;

  await prisma.recommendation.createMany({
    data: fresh.map((c) => ({
      userId,
      basedOn: c.basedOn,
      basedOnId: c.basedOnId,
      action: c.action,
      priority: c.priority,
    })),
  });

  return fresh.length;
}

export interface RecommendationView {
  id: string;
  basedOn: string;
  basedOnId: string;
  action: string;
  priority: string;
  status: string;
  createdAt: string;
}

export async function getRecommendations(
  userId: string,
  status?: "PENDING" | "APPLIED" | "DISMISSED"
): Promise<RecommendationView[]> {
  let rows = await prisma.recommendation.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  if (rows.length === 0 && !status) {
    const computed = await recomputeRecommendations(userId);
    if (computed > 0) {
      rows = await prisma.recommendation.findMany({
        where: { userId },
        orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
        take: 50,
      });
    }
  }

  return rows.map((r) => ({
    id: r.id,
    basedOn: r.basedOn,
    basedOnId: r.basedOnId,
    action: r.action,
    priority: r.priority,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Set a recommendation's status — the review feedback loop.
 * APPLIED = ตรวจสอบแล้ว, DISMISSED = พักไว้/ไม่เกี่ยวข้อง, PENDING = เปิดกลับมาตรวจใหม่.
 */
export async function setRecommendationStatus(
  userId: string,
  id: string,
  status: "APPLIED" | "DISMISSED" | "PENDING"
): Promise<boolean> {
  const rec = await prisma.recommendation.findFirst({ where: { id, userId } });
  if (!rec) return false;
  await prisma.recommendation.update({ where: { id }, data: { status } });
  return true;
}
