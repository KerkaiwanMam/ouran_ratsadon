import { NextResponse } from "next/server";
import type { Transaction } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLatestForecastSnapshot } from "@/lib/analytics/predict";

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 2, WARNING: 1, INFO: 0 };

// GET /api/business/dashboard
// Aggregates the current user's real uploaded transactions into the shape
// the dashboard UI needs: summary (income/expense/net/category breakdown
// with month-over-month trend) + recent transactions with leak flags.
export async function GET() {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  let transactions: Transaction[];
  try {
    transactions = await prisma.transaction.findMany({
      where: { userId: payload.sub },
      orderBy: { date: "desc" },
      // Bound the query: the dashboard only needs the current + previous
      // month for its summary, and recent uploads rarely exceed a few
      // hundred rows/month. This cap protects against unbounded memory use
      // for users with a long upload history while comfortably covering
      // 2+ months of typical SME transaction volume.
      take: 3000,
    });
  } catch {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }

  if (transactions.length === 0) {
    return NextResponse.json({
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
    });
  }

  // Latest month present in the data = "current" period; the month before it
  // is used to compute the month-over-month trend per category.
  const monthKey = (d: Date) => d.toISOString().slice(0, 7);
  const months = Array.from(new Set(transactions.map((t) => monthKey(t.date)))).sort();
  const currentMonth = months[months.length - 1];
  const previousMonth = months.length > 1 ? months[months.length - 2] : null;

  const currentTx = transactions.filter((t) => monthKey(t.date) === currentMonth);
  const previousTx = previousMonth
    ? transactions.filter((t) => monthKey(t.date) === previousMonth)
    : [];

  // Transaction.amount is Prisma.Decimal (@db.Decimal(15,2)) — coerce to number for arithmetic.
  const totalIncome = currentTx
    .filter((t) => t.transactionType === "INCOME")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = currentTx
    .filter((t) => t.transactionType === "EXPENSE")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const netCashFlow = totalIncome - totalExpense;

  function categoryTotals(rows: typeof transactions) {
    const totals: Record<string, number> = {};
    for (const t of rows) {
      if (t.transactionType !== "EXPENSE") continue;
      totals[t.category] = (totals[t.category] ?? 0) + Math.abs(Number(t.amount));
    }
    return totals;
  }

  const currentTotals = categoryTotals(currentTx);
  const previousTotals = categoryTotals(previousTx);
  const expenseSum = Object.values(currentTotals).reduce((s, v) => s + v, 0) || 1;

  const categories = Object.entries(currentTotals)
    .map(([name, amount]) => {
      const prev = previousTotals[name] ?? 0;
      const isNew = previousMonth !== null && prev === 0;
      const trendPct = prev > 0 ? Math.round(((amount - prev) / prev) * 1000) / 10 : 0;
      return {
        name,
        amount,
        percentage: Math.round((amount / expenseSum) * 1000) / 10,
        trendPct,
        // True when this category had no spending last month (or there is no
        // previous month to compare against) — lets the UI show "หมวดใหม่"
        // instead of a misleading "0% change".
        isNew,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Budget targets for the current month (month-specific wins over standing)
  const rawBudgets = await prisma.budget.findMany({
    where: {
      userId: payload.sub,
      OR: [{ month: currentMonth }, { month: null }],
    },
  });
  const budgetMap = new Map<string, number>();
  // Budget.amount is Prisma.Decimal — coerce for JS comparison / arithmetic.
  for (const b of rawBudgets.filter((b) => b.month === null)) budgetMap.set(b.category, Number(b.amount));
  for (const b of rawBudgets.filter((b) => b.month !== null)) budgetMap.set(b.category, Number(b.amount));

  const categoriesWithBudget = categories.map((c) => ({
    ...c,
    budgetAmount: budgetMap.get(c.name) ?? null,
  }));

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
        const sevDiff = (SEVERITY_RANK[b.leakSeverity ?? "INFO"] ?? 0) - (SEVERITY_RANK[a.leakSeverity ?? "INFO"] ?? 0);
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
