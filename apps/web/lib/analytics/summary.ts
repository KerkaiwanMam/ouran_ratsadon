// Tier 1 — Descriptive Analytics ("What happened?")
// Spec: docs/analytics-module-spec.md §2 MonthlyFinancialSummary
//
// Aggregates a user's Transaction rows into month × category rollups and
// persists them as derived/cached rows (recomputable any time — never the
// source of truth). Called post-upload and can be re-run via cron; reading
// from MonthlyFinancialSummary instead of aggregating live keeps dashboard
// loads cheap as a user's transaction history grows.

import { prisma } from "@/lib/db";

export interface MonthCategoryRollup {
  month: string;
  category: string;
  totalIncome: number;
  totalExpense: number;
  txCount: number;
}

/** Pure aggregation — group transactions by (month, category). Exported for tests.
 *  `amount` accepts Decimal | number — Prisma.Decimal is coerced with Number() so
 *  this function is safe to call with raw DB rows without a mapping step. */
export function aggregateByMonthCategory(
  transactions: { date: Date; category: string; amount: { toNumber?: () => number } | number; transactionType: string }[]
): MonthCategoryRollup[] {
  const map = new Map<string, MonthCategoryRollup>();

  for (const tx of transactions) {
    const month = tx.date.toISOString().slice(0, 7); // "YYYY-MM"
    const key = `${month}|${tx.category}`;
    const entry = map.get(key) ?? {
      month,
      category: tx.category,
      totalIncome: 0,
      totalExpense: 0,
      txCount: 0,
    };
    const amt = typeof tx.amount === "number" ? tx.amount : Number(tx.amount);
    if (tx.transactionType === "INCOME") entry.totalIncome += amt;
    else entry.totalExpense += Math.abs(amt);
    entry.txCount += 1;
    map.set(key, entry);
  }

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Recompute and upsert MonthlyFinancialSummary rows for a user from their
 * current Transaction table. Safe to call repeatedly (idempotent via
 * @@unique([userId, month, category])) — e.g. after upload completes, or
 * from a nightly cron job.
 */
export async function recomputeMonthlySummary(userId: string): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true, category: true, amount: true, transactionType: true },
    take: 20000,
  });

  const rollups = aggregateByMonthCategory(transactions);

  for (const r of rollups) {
    await prisma.monthlyFinancialSummary.upsert({
      where: { userId_month_category: { userId, month: r.month, category: r.category } },
      update: {
        totalIncome: r.totalIncome,
        totalExpense: r.totalExpense,
        txCount: r.txCount,
        computedAt: new Date(),
      },
      create: {
        userId,
        month: r.month,
        category: r.category,
        totalIncome: r.totalIncome,
        totalExpense: r.totalExpense,
        txCount: r.txCount,
      },
    });
  }

  return rollups.length;
}

export interface DescriptiveSummaryResponse {
  months: {
    month: string;
    totalIncome: number;
    totalExpense: number;
    net: number;
    byCategory: { category: string; totalIncome: number; totalExpense: number; txCount: number }[];
  }[];
  computedAt: string | null;
}

/**
 * Read the pre-aggregated summary for the last `range` months. Falls back to
 * live aggregation (and triggers a recompute) if no cached rows exist yet —
 * e.g. for a user who hasn't uploaded since this feature shipped.
 */
export async function getDescriptiveSummary(
  userId: string,
  range = 6
): Promise<DescriptiveSummaryResponse> {
  let rows = await prisma.monthlyFinancialSummary.findMany({
    where: { userId },
    orderBy: { month: "asc" },
  });

  if (rows.length === 0) {
    await recomputeMonthlySummary(userId);
    rows = await prisma.monthlyFinancialSummary.findMany({
      where: { userId },
      orderBy: { month: "asc" },
    });
  }

  const months = Array.from(new Set(rows.map((r) => r.month))).slice(-range);
  const computedAt = rows.length > 0
    ? rows.reduce((latest, r) => (r.computedAt > latest ? r.computedAt : latest), rows[0].computedAt).toISOString()
    : null;

  return {
    months: months.map((month) => {
      const monthRows = rows.filter((r) => r.month === month);
      // MonthlyFinancialSummary.totalIncome/totalExpense are Decimal in DB;
      // Number() converts Prisma.Decimal to a plain JS number for arithmetic.
      const totalIncome = monthRows.reduce((s, r) => s + Number(r.totalIncome), 0);
      const totalExpense = monthRows.reduce((s, r) => s + Number(r.totalExpense), 0);
      return {
        month,
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
        byCategory: monthRows
          .map((r) => ({
            category: r.category,
            totalIncome: Number(r.totalIncome),
            totalExpense: Number(r.totalExpense),
            txCount: r.txCount,
          }))
          .sort((a, b) => b.totalExpense - a.totalExpense),
      };
    }),
    computedAt,
  };
}
