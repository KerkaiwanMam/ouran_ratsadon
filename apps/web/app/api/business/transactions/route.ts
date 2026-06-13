import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { countKeywords, TRANSACTION_KEYWORDS } from "@/lib/keywords";

// GET /api/business/transactions
// Filtered/paginated transaction list — backs the /transactions drill-down
// page (Phase 1: "Transaction drill-down — คลิกกราฟ/leak → เห็น raw row").
// Query params:
//   category = exact category name
//   leakFlag = NONE | SPIKE | DUPLICATE | OUTLIER | CREEP
//   month    = "YYYY-MM"
//   search   = substring match on description (case-insensitive)
//   page     = 1-based page number (default 1, page size 20)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const leakFlag = searchParams.get("leakFlag");
  const month = searchParams.get("month");
  const search = searchParams.get("search")?.trim();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 25;

  const where: Record<string, unknown> = { userId: auth.userId };
  if (category) where.category = category;
  if (leakFlag && ["NONE", "SPIKE", "DUPLICATE", "OUTLIER", "CREEP"].includes(leakFlag)) {
    where.leakFlag = leakFlag;
  }
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    where.date = { gte: start, lt: end };
  }
  if (search) {
    where.description = { contains: search, mode: "insensitive" };
  }

  const [total, rows, categories, descriptions, totalsByType] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        date: true,
        description: true,
        category: true,
        amount: true,
        transactionType: true,
        autoCategorized: true,
        userOverrode: true,
        leakFlag: true,
        leakSeverity: true,
        leakReason: true,
        file: { select: { id: true, filename: true } },
      },
    }),
    // Distinct categories for this user — populates the category-edit dropdown.
    prisma.transaction.findMany({
      where: { userId: auth.userId },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
    // All descriptions matching the current filters (unpaginated) — powers
    // the "KeywordBudget" view's keyword-frequency cloud.
    prisma.transaction.findMany({
      where,
      select: { description: true },
    }),
    // Income/expense totals across *all* filtered rows (unpaginated) — powers
    // the รายรับ/รายจ่าย/สุทธิ summary above the table.
    prisma.transaction.groupBy({
      by: ["transactionType"],
      where,
      _sum: { amount: true },
    }),
  ]);

  const keywords = countKeywords(
    descriptions.map((d) => d.description),
    TRANSACTION_KEYWORDS,
    20
  );

  const totalIncome = Number(
    totalsByType.find((t) => t.transactionType === "INCOME")?._sum.amount ?? 0
  );
  const totalExpense = Number(
    totalsByType.find((t) => t.transactionType === "EXPENSE")?._sum.amount ?? 0
  );

  return NextResponse.json({
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize) || 1,
    categories: categories.map((c) => c.category),
    keywords,
    summary: {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
    },
    items: rows.map((t) => ({
      ...t,
      amount: Number(t.amount),
      date: t.date.toISOString().slice(0, 10),
    })),
  });
}
