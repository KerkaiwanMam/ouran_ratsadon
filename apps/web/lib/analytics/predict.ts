// Tier 3 — Predictive Analytics ("What will happen?")
// Spec: docs/analytics-module-spec.md §4 ForecastSnapshot
//
// IMPORTANT: per CLAUDE.md, forecasting MUST stay Weighted Moving Average +
// Seasonal Index and always be disclosed as NOT AI/ML. This module does NOT
// reimplement forecasting — it wraps the existing `lib/forecaster.ts` engine
// (already used by /api/business/forecast) and persists a snapshot of its
// output to ForecastSnapshot, so Tier 4 (Prescriptive) and the analytics
// dashboard can read a stable, explainable record of "what we predicted and
// from what inputs" without recomputing on every read.

import { prisma } from "@/lib/db";
import { forecast, type MonthlyPoint, type ForecastResult } from "@/lib/forecaster";

/** Aggregate raw transactions into month-level income/expense points. */
export function buildMonthlyHistory(
  transactions: { date: Date; amount: number; transactionType: string }[]
): MonthlyPoint[] {
  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const tx of transactions) {
    const mo = tx.date.toISOString().slice(0, 7);
    const entry = byMonth.get(mo) ?? { income: 0, expense: 0 };
    // Transaction.amount is Prisma.Decimal — coerce to number for arithmetic
    const amt = Number(tx.amount);
    if (tx.transactionType === "INCOME") entry.income += amt;
    else entry.expense += Math.abs(amt);
    byMonth.set(mo, entry);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { income, expense }]) => ({
      month,
      income,
      expense,
      net: income - expense,
    }));
}

/**
 * Run the WMA + Seasonal forecast for a user and persist a snapshot of the
 * first forecasted month (the "next month" prediction — the figure most
 * useful to Tier 4 recommendations and dashboard headline cards). The full
 * `inputWindow` (trailing months actually used + method) is stored verbatim
 * so the "วิธีคิด" disclosure shown in the UI can be reproduced exactly.
 *
 * Returns the full ForecastResult (for callers that want the whole curve)
 * plus the persisted snapshot id, or null if there isn't enough data yet.
 */
export async function recomputeForecastSnapshot(
  userId: string,
  currentCash = 0
): Promise<{ result: ForecastResult; snapshotId: string | null }> {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    select: { date: true, amount: true, transactionType: true },
    take: 5000,
  });

  // Transaction.amount is Prisma.Decimal — coerce to number before forecasting.
  const historical = buildMonthlyHistory(
    transactions.map((t) => ({ ...t, amount: Number(t.amount) }))
  );
  const result = forecast(historical, 6, currentCash);

  if (result.sufficiency === "insufficient" || result.forecast.length === 0) {
    return { result, snapshotId: null };
  }

  const first = result.forecast[0];
  // inputWindow is now a Json (jsonb) column — store as a plain object, no JSON.stringify needed.
  // method is always WMA_SEASONAL per CLAUDE.md; whether the seasonal index was applied
  // is captured in the `method` suffix stored in inputWindow for the UI disclosure.
  const inputWindowObj = {
    method: result.sufficiency === "full" ? "WMA_SEASONAL" : "WMA",
    monthsOfData: result.monthsOfData,
    trailingMonths: historical.slice(-3).map((p) => p.month),
    disclaimer: result.disclaimer,
  };

  const snapshot = await prisma.forecastSnapshot.create({
    data: {
      userId,
      forecastMonth: first.month,
      method: "WMA_SEASONAL", // enum — always WMA_SEASONAL per spec
      predictedNet: first.forecastNet,
      confidenceLow: first.lowerIncome - first.upperExpense,
      confidenceHigh: first.upperIncome - first.lowerExpense,
      cashRunwayMonths: result.runway ?? null,
      inputWindow: inputWindowObj,
    },
  });

  return { result, snapshotId: snapshot.id };
}

export interface ForecastSnapshotView {
  id: string;
  forecastMonth: string;
  method: string;
  predictedNet: number;
  confidenceLow: number;
  confidenceHigh: number;
  cashRunwayMonths: number | null;
  inputWindow: unknown;
  generatedAt: string;
}

/** Most recent persisted snapshot for a user, or null if none exist yet. */
export async function getLatestForecastSnapshot(
  userId: string
): Promise<ForecastSnapshotView | null> {
  const row = await prisma.forecastSnapshot.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
  });
  if (!row) return null;

  // inputWindow is Json (@db.JsonB) — Prisma returns a parsed JS object, no JSON.parse needed.
  // Decimal fields (predictedNet etc.) must be coerced to number for the view interface.
  return {
    id: row.id,
    forecastMonth: row.forecastMonth,
    method: row.method,
    predictedNet: Number(row.predictedNet),
    confidenceLow: Number(row.confidenceLow),
    confidenceHigh: Number(row.confidenceHigh),
    cashRunwayMonths: row.cashRunwayMonths != null ? Number(row.cashRunwayMonths) : null,
    inputWindow: row.inputWindow,
    generatedAt: row.generatedAt.toISOString(),
  };
}
