import { NextResponse } from "next/server";
import type { Transaction } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDescriptiveSummary } from "@/lib/analytics/summary";
import { getLatestForecastSnapshot } from "@/lib/analytics/predict";

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 2, WARNING: 1, INFO: 0 };

const EMPTY = {
  hasData: false,
  summary: {
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    burnRate: 0,
    categories: [],
    period: null,
    cashRunwayMonths: null,
    topLeak: null,
    isPro: false,
  },
  transactions: [],
};

// GET /api/business/dashboard
// One View One Truth: the headline numbers (income / expense / net / category
// totals + month-over-month trend) are read from the governed
// MonthlyFinancialSummary rollups via getDescriptiveSummary — the SAME source
// /analytics, /action-items and the AI assistant read, so a metric can never
// disagree across pages. Row-level data that the rollups don't carry (recent
// transactions, leak flags) is the only thing read live from Transaction.
export async function GET() {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  let summary: Awaited<ReturnType<typeof getDescriptiveSummary>>;
  let txRows: Transaction[];
  try {
    // range=2 → current + previous month, enough for the headline + trend.
    [summary, txRows] = await Promise.all([
      getDescriptiveSummary(payload.sub, 2),
      prisma.transaction.findMany({
        where: { userId: payload.sub },
        orderBy: { date: "desc" },
        // Only used for the recent list + leak surfacing below; the current
        // month sits at the head of a date-desc scan, so this cap is safe.
        take: 3000,
      }),
    ]);
  } catch {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }

  const gCurrent = summary.months[summary.months.length - 1] ?? null;
  const gPrevious = summary.months.length > 1 ? summary.months[summary.months.length - 2] : null;

  if (!gCurrent) {
    return NextResponse.json(EMPTY);
  }

  const currentMonth = gCurrent.month;
  const previousMonth = gPrevious?.month ?? null;

  // ── Headline numbers — governed source (One View One Truth) ───────────────
  const totalIncome = gCurrent.totalIncome;
  const totalExpense = gCurrent.totalExpense;
  const netCashFlow = gCurrent.net;
  const expenseSum = totalExpense || 1;

  const prevByCat = new Map(
    (gPrevious?.byCategory ?? []).map((c) => [c.category, c.totalExpense])
  );

  const categories = gCurrent.byCategory
    .filter((c) => c.totalExpense > 0)
    .map((c) => {
      const prev = prevByCat.get(c.category) ?? 0;
      // True when this category had no spending last month (or there is no
      // previous month) — lets the UI show "หมวดใหม่" instead of a misleading 0%.
      const isNew = previousMonth !== null && prev === 0;
      const trendPct = prev > 0 ? Math.round(((c.totalExpense - prev) / prev) * 1000) / 10 : 0;
      return {
        name: c.category,
        amount: c.totalExpense,
        percentage: Math.round((c.totalExpense / expenseSum) * 1000) / 10,
        trendPct,
        isNew,
      };
    });
  // getDescriptiveSummary already returns byCategory sorted by totalExpense desc.

  // Budget targets for the current month (month-specific wins over standing).
  const rawBudgets = await prisma.budget.findMany({
    where: { userId: payload.sub, OR: [{ month: currentMonth }, { month: null }] },
  });
  const budgetMap = new Map<string, number>();
  // Budget.amount is Prisma.Decimal — coerce for JS comparison / arithmetic.
  for (const b of rawBudgets.filter((b) => b.month === null)) budgetMap.set(b.category, Number(b.amount));
  for (const b of rawBudgets.filter((b) => b.month !== null)) budgetMap.set(b.category, Number(b.amount));

  const categoriesWithBudget = categories.map((c) => ({
    ...c,
    budgetAmount: budgetMap.get(c.name) ?? null,
  }));

  // ── Row-level data — read live from Transaction (rollups don't carry it) ──
  const monthKey = (d: Date) => d.toISOString().slice(0, 7);
  const currentTx = txRows.filter((t) => monthKey(t.date) === currentMonth);

  const recent = currentTx.slice(0, 15).map((t) => ({
    id: t.id,
    description: t.description,
    category: t.category,
    amount: Number(t.amount),
    transactionType: t.transactionType,
    date: t.date.toISOString().slice(0, 10),
    leakFlag: t.leakFlag,
    leakSeverity: t.leakSeverity,
    leakReason: t.leakReason,
  }));

  // Burn rate — net cash outflow for the current month (0 if cash-flow positive).
  const burnRate = netCashFlow < 0 ? Math.abs(netCashFlow) : 0;

  // Top leak — the most severe flagged transaction this month (CRITICAL first,
  // then by size), so the dashboard can surface "what to look at first".
  const flagged = currentTx.filter((t) => t.leakFlag !== "NONE");
  const topLeakTx = flagged.length
    ? [...flagged].sort((a, b) => {
        const sevDiff =
          (SEVERITY_RANK[b.leakSeverity ?? "INFO"] ?? 0) - (SEVERITY_RANK[a.leakSeverity ?? "INFO"] ?? 0);
        if (sevDiff !== 0) return sevDiff;
        return Math.abs(Number(b.amount)) - Math.abs(Number(a.amount));
      })[0]
    : null;
  const topLeak = topLeakTx
    ? {
        id: topLeakTx.id,
        description: topLeakTx.description,
        category: topLeakTx.category,
        amount: Number(topLeakTx.amount),
        leakFlag: topLeakTx.leakFlag,
        leakSeverity: topLeakTx.leakSeverity,
        leakReason: topLeakTx.leakReason,
      }
    : null;

  // Cash runway — Pro-only, read from the persisted ForecastSnapshot (WMA-based,
  // not recomputed here — see /api/business/analytics/forecast for that).
  const subscription = await prisma.subscription.findUnique({ where: { userId: payload.sub } });
  const isPro = !!(
    subscription &&
    (subscription.plan === "PRO" || subscription.plan === "TEAM") &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIAL")
  );
  const snapshot = isPro ? await getLatestForecastSnapshot(payload.sub) : null;
  const cashRunwayMonths = snapshot?.cashRunwayMonths ?? null;

  return NextResponse.json({
    hasData: true,
    summary: {
      totalIncome,
      totalExpense,
      netCashFlow,
      burnRate,
      categories: categoriesWithBudget,
      period: currentMonth,
      cashRunwayMonths,
      topLeak,
      isPro,
    },
    transactions: recent,
  });
}
