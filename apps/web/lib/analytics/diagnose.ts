// Tier 2 — Diagnostic Analytics ("Why did it happen?")
// Spec: docs/analytics-module-spec.md §3 DiagnosticInsight
//
// Explains *why* a month/category looks the way it does by comparing it
// against the user's own history (z-score over MonthlyFinancialSummary rows
// — the same derived rollups Tier 1 produces) and pointing back at the
// specific transactions driving the anomaly. This sits a level above the
// per-row leak flags already on Transaction: leak detection says "this row
// looks off", diagnostics says "here's the month-level story and which rows
// explain it".
//
// Statistical method only — z-score + simple month-over-month deltas, no
// black-box modeling. Mirrors the plain-language style of leak-detector.ts.

import { prisma } from "@/lib/db";

export interface CategoryMonthPoint {
  month: string;
  category: string;
  totalExpense: number;
}

export interface DiagnosticCandidate {
  month: string;
  category: string;
  insightType: "category_spike" | "new_vendor_surge" | "seasonal_drop";
  summary: string;
  relatedTxIds: string[];
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[], avg: number): number {
  if (xs.length < 2) return 0;
  const variance = xs.reduce((s, x) => s + (x - avg) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/**
 * Pure analysis — given a user's month×category expense history (sorted
 * ascending by month) and the transactions for the most recent month, derive
 * plain-language diagnostic candidates. Exported for tests.
 *
 * Rules (each looks only at the latest month vs. that category's own history):
 *  - category_spike: latest month's total is >2 standard deviations above
 *    the category's historical mean (z-score > 2, needs ≥3 prior months)
 *  - seasonal_drop: latest month's total is >2 standard deviations below
 *    the category's historical mean
 *  - new_vendor_surge: a category had ~zero spend historically (≤1 prior
 *    month with activity) but a meaningful amount this month — i.e. a brand
 *    new cost center appearing suddenly
 */
export function buildDiagnosticCandidates(
  history: CategoryMonthPoint[],
  latestMonthTx: { id: string; category: string; amount: number; description: string }[]
): DiagnosticCandidate[] {
  if (history.length === 0) return [];
  const latestMonth = history[history.length - 1].month;

  const byCategory = new Map<string, CategoryMonthPoint[]>();
  for (const point of history) {
    const list = byCategory.get(point.category) ?? [];
    list.push(point);
    byCategory.set(point.category, list);
  }

  const candidates: DiagnosticCandidate[] = [];

  for (const [category, points] of byCategory) {
    const sorted = [...points].sort((a, b) => a.month.localeCompare(b.month));
    const latest = sorted.find((p) => p.month === latestMonth);
    if (!latest) continue;

    const prior = sorted.filter((p) => p.month !== latestMonth);
    const relatedTxIds = latestMonthTx
      .filter((t) => t.category === category)
      .map((t) => t.id);

    const priorActive = prior.filter((p) => p.totalExpense > 0);

    // new_vendor_surge — essentially no spending history, sudden activity
    if (priorActive.length <= 1 && latest.totalExpense > 0 && prior.length >= 2) {
      candidates.push({
        month: latestMonth,
        category,
        insightType: "new_vendor_surge",
        summary: `หมวด "${category}" แทบไม่มีค่าใช้จ่ายในเดือนก่อนหน้า แต่เดือนนี้มีค่าใช้จ่ายเกิดขึ้น ${latest.totalExpense.toLocaleString(
          "th-TH"
        )} บาท — อาจเป็นผู้ให้บริการ/ค่าใช้จ่ายรายการใหม่ที่เพิ่งเริ่มต้น`,
        relatedTxIds,
      });
      continue;
    }

    if (prior.length < 3) continue; // not enough history for z-score

    const priorTotals = prior.map((p) => p.totalExpense);
    const avg = mean(priorTotals);
    const sd = stddev(priorTotals, avg);
    if (sd === 0) continue;

    const z = (latest.totalExpense - avg) / sd;

    if (z > 2) {
      candidates.push({
        month: latestMonth,
        category,
        insightType: "category_spike",
        summary: `ค่าใช้จ่ายหมวด "${category}" เดือนนี้อยู่ที่ ${latest.totalExpense.toLocaleString(
          "th-TH"
        )} บาท สูงกว่าค่าเฉลี่ยที่ผ่านมา (${avg.toLocaleString("th-TH", {
          maximumFractionDigits: 0,
        })} บาท) อย่างมีนัยสำคัญ (z-score ${z.toFixed(1)}) — ควรตรวจสอบรายการที่เกี่ยวข้อง`,
        relatedTxIds,
      });
    } else if (z < -2 && avg > 0) {
      candidates.push({
        month: latestMonth,
        category,
        insightType: "seasonal_drop",
        summary: `ค่าใช้จ่ายหมวด "${category}" เดือนนี้อยู่ที่ ${latest.totalExpense.toLocaleString(
          "th-TH"
        )} บาท ต่ำกว่าค่าเฉลี่ยที่ผ่านมา (${avg.toLocaleString("th-TH", {
          maximumFractionDigits: 0,
        })} บาท) อย่างมีนัยสำคัญ (z-score ${z.toFixed(1)}) — อาจเป็นความผันผวนตามฤดูกาลหรือรายจ่ายที่หายไป`,
        relatedTxIds,
      });
    }
  }

  return candidates;
}

/**
 * Recompute diagnostic insights for a user's most recent month and persist
 * them as DiagnosticInsight rows. Idempotent: clears any existing insights
 * for that month before inserting fresh ones, so re-running (e.g. after a
 * new upload) doesn't pile up stale duplicates.
 */
export async function recomputeDiagnosticInsights(userId: string): Promise<number> {
  const rows = await prisma.monthlyFinancialSummary.findMany({
    where: { userId },
    orderBy: { month: "asc" },
    select: { month: true, category: true, totalExpense: true },
  });
  if (rows.length === 0) return 0;

  const latestMonth = rows[rows.length - 1].month;
  const [yearStr, monthStr] = latestMonth.split("-");
  const rangeStart = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const rangeEnd = new Date(Number(yearStr), Number(monthStr), 1);

  const latestMonthTx = await prisma.transaction.findMany({
    where: { userId, date: { gte: rangeStart, lt: rangeEnd } },
    select: { id: true, category: true, amount: true, description: true },
    take: 5000,
  });

  // MonthlyFinancialSummary.totalExpense and Transaction.amount are Prisma.Decimal;
  // coerce to number so the pure buildDiagnosticCandidates function gets plain JS numbers.
  const historyNumbers = rows.map((r) => ({
    month: r.month,
    category: r.category,
    totalExpense: Number(r.totalExpense),
  }));
  const latestMonthTxNumbers = latestMonthTx.map((t) => ({
    id: t.id,
    category: t.category,
    amount: Number(t.amount),
    description: t.description,
  }));

  const candidates = buildDiagnosticCandidates(historyNumbers, latestMonthTxNumbers);

  await prisma.diagnosticInsight.deleteMany({ where: { userId, month: latestMonth } });
  if (candidates.length > 0) {
    await prisma.diagnosticInsight.createMany({
      data: candidates.map((c) => ({
        userId,
        month: c.month,
        category: c.category,
        insightType: c.insightType,
        summary: c.summary,
        relatedTxIds: c.relatedTxIds, // Json (@db.JsonB) — store as array, no JSON.stringify needed
      })),
    });
  }

  return candidates.length;
}

export interface DiagnosticInsightView {
  id: string;
  month: string;
  category: string;
  insightType: string;
  summary: string;
  relatedTxIds: string[];
  createdAt: string;
}

/**
 * Read recent diagnostic insights. Lazily triggers a recompute if none exist
 * yet for a user who has transaction history (e.g. first call after this
 * feature shipped).
 */
export async function getDiagnosticInsights(
  userId: string,
  limit = 20
): Promise<DiagnosticInsightView[]> {
  let rows = await prisma.diagnosticInsight.findMany({
    where: { userId },
    orderBy: [{ month: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  if (rows.length === 0) {
    const computed = await recomputeDiagnosticInsights(userId);
    if (computed > 0) {
      rows = await prisma.diagnosticInsight.findMany({
        where: { userId },
        orderBy: [{ month: "desc" }, { createdAt: "desc" }],
        take: limit,
      });
    }
  }

  return rows.map((r) => ({
    id: r.id,
    month: r.month,
    category: r.category,
    insightType: r.insightType,
    summary: r.summary,
    relatedTxIds: Array.isArray(r.relatedTxIds) ? (r.relatedTxIds as string[]) : [], // Json (@db.JsonB) — already parsed by Prisma
    createdAt: r.createdAt.toISOString(),
  }));
}
