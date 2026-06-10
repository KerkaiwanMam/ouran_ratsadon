import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forecast } from "@/lib/forecaster";
import type { MonthlyPoint } from "@/lib/forecaster";

// GET /api/business/forecast?horizon=6&currentCash=100000
// Returns WMA + seasonal forecast for the current user's transactions.
// Pro-only endpoint.
export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: payload.sub } });
  const isPro =
    sub &&
    (sub.plan === "PRO" || sub.plan === "TEAM") &&
    (sub.status === "ACTIVE" || sub.status === "TRIAL");

  if (!isPro) {
    return NextResponse.json(
      { error: "PLAN_REQUIRED", message: "ฟีเจอร์นี้สำหรับสมาชิก Pro ขึ้นไปเท่านั้น" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const horizon = Math.min(12, Math.max(3, parseInt(searchParams.get("horizon") ?? "6", 10)));
  const currentCash = parseFloat(searchParams.get("currentCash") ?? "0");

  const transactions = await prisma.transaction.findMany({
    where: { userId: payload.sub },
    orderBy: { date: "asc" },
    select: { date: true, amount: true, transactionType: true },
    take: 5000,
  });

  if (transactions.length === 0) {
    return NextResponse.json({
      sufficiency: "insufficient",
      monthsOfData: 0,
      historical: [],
      forecast: [],
      runway: null,
      disclaimer: "ต้องมีข้อมูลอย่างน้อย 3 เดือนจึงจะพยากรณ์ได้",
    });
  }

  // Aggregate by month
  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const tx of transactions) {
    const mo = tx.date.toISOString().slice(0, 7);
    const entry = byMonth.get(mo) ?? { income: 0, expense: 0 };
    // Transaction.amount is Prisma.Decimal — coerce to number for arithmetic.
    if (tx.transactionType === "INCOME") entry.income += Number(tx.amount);
    else entry.expense += Math.abs(Number(tx.amount));
    byMonth.set(mo, entry);
  }

  const historical: MonthlyPoint[] = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { income, expense }]) => ({
      month,
      income,
      expense,
      net: income - expense,
    }));

  return NextResponse.json(forecast(historical, horizon, currentCash));
}
