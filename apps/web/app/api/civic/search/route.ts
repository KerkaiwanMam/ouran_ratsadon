import { NextRequest, NextResponse } from "next/server";
import { getBudgetYear, getAvailableYears, searchProjects } from "@/lib/civic-cache";
import type { SearchFilters, BudgetType } from "@/types/civic";

export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const p = url.searchParams;

  // Default to the latest fiscal year on disk (not a hardcoded "2568") so a
  // freshly-uploaded year shows up in search results without requiring the
  // caller to pass ?year= explicitly — same fix as /explore (page.tsx).
  const availableYears = getAvailableYears();
  const latestYear = availableYears[availableYears.length - 1] ?? "2568";
  const year = p.get("year") ?? latestYear;
  const data = getBudgetYear(year);

  if (!data) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `ไม่พบข้อมูลปีงบประมาณ ${year}` },
      { status: 404 }
    );
  }

  const filters: SearchFilters = {
    q: p.get("q") ?? undefined,
    ministries: p.getAll("ministries[]").filter(Boolean),
    budgetTypes: p.getAll("budgetTypes[]").filter(Boolean) as BudgetType[],
    minAmount: p.get("minAmount") ? Number(p.get("minAmount")) : undefined,
    maxAmount: p.get("maxAmount") ? Number(p.get("maxAmount")) : undefined,
    status: p.getAll("status[]").filter(Boolean),
    sort: (p.get("sort") as SearchFilters["sort"]) ?? "amount_desc",
    page: Number(p.get("page") ?? 1),
    limit: Math.min(Number(p.get("limit") ?? 20), 100),
  };

  const allResults = searchProjects(data, filters);
  const total = allResults.length;
  const page = filters.page!;
  const limit = filters.limit!;
  const start = (page - 1) * limit;
  const results = allResults.slice(start, start + limit);

  const totalAmount = allResults.reduce((s, p) => s + p.amount, 0);
  const redFlagCount = allResults.filter((p) => p.flags.length > 0).length;
  const avgIncreasePct =
    allResults.length > 0
      ? allResults.reduce((s, p) => s + p.changePct, 0) / allResults.length
      : 0;

  // Breakdown of the *currently filtered/searched* results by budget type —
  // gives users an at-a-glance "what kind of spending am I looking at" view
  // (e.g. searching "บุคลากร" should visibly skew this toward personnel).
  const byTypeAmount: Record<string, number> = {};
  for (const p of allResults) {
    byTypeAmount[p.budgetType] = (byTypeAmount[p.budgetType] ?? 0) + p.amount;
  }
  const categoryBreakdown = Object.entries(byTypeAmount)
    .map(([budgetType, amount]) => ({
      budgetType,
      amount,
      percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return NextResponse.json({
    total,
    page,
    limit,
    stats: {
      totalAmount,
      redFlagCount,
      avgIncreasePct: Math.round(avgIncreasePct * 10) / 10,
      newProjectCount: 0,
      categoryBreakdown,
    },
    results,
  });
}
