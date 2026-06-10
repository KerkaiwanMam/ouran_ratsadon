import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/business/report/[id]/export/pdf
// Returns the data needed to render a print-optimized PDF report.
// Pro-only — Free users get 403.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      { error: "PLAN_REQUIRED", message: "PDF export สำหรับสมาชิก Pro เท่านั้น" },
      { status: 403 }
    );
  }

  const { id: fileId } = await params;

  const file = await prisma.file.findFirst({
    where: { id: fileId, userId: payload.sub },
    include: {
      transactions: {
        orderBy: { date: "desc" },
        take: 200,
      },
    },
  });

  if (!file) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบไฟล์" },
      { status: 404 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { name: true, email: true, organization: true },
  });

  // Aggregate summaries
  // Transaction.amount is Prisma.Decimal (@db.Decimal(15,2)) — coerce to number for arithmetic.
  const income = file.transactions.filter((t) => t.transactionType === "INCOME");
  const expense = file.transactions.filter((t) => t.transactionType === "EXPENSE");
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = expense.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const leaks = file.transactions.filter((t) => t.leakFlag !== "NONE");

  const byCategory: Record<string, number> = {};
  for (const t of expense) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + Math.abs(Number(t.amount));
  }

  return NextResponse.json({
    file: {
      id: file.id,
      filename: file.filename,
      periodStart: file.periodStart,
      periodEnd: file.periodEnd,
      transactionCount: file.transactionCount,
    },
    user,
    summary: {
      totalIncome,
      totalExpense,
      netCashFlow: totalIncome - totalExpense,
      leakCount: leaks.length,
    },
    categories: Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount]) => ({ name, amount })),
    leaks: leaks.slice(0, 20).map((t) => ({
      date: t.date.toISOString().slice(0, 10),
      description: t.description,
      amount: Number(t.amount),
      leakFlag: t.leakFlag,
      leakSeverity: t.leakSeverity,
      leakReason: t.leakReason,
    })),
  });
}
