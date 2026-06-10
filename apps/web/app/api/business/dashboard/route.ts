import { NextResponse } from "next/server";
import type { Transaction } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
        categories: [],
        period: null,
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

  return NextResponse.json({
    hasData: true,
    summary: {
      totalIncome,
      totalExpense,
      netCashFlow,
      categories: categoriesWithBudget,
      period: currentMonth,
    },
    transactions: recent,
  });
}
