import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeVendorName } from "@/lib/vendor";

// GET /api/business/vendors
// Groups all EXPENSE transactions by normalized vendor/description, returning
// total spend, transaction count, most-used category, and a 6-month spend
// trend per vendor — backs the Pro /vendors page (Phase 1: "Vendor profile +
// trend — group tx by supplier, show trend").
// Query params:
//   search = substring match on vendor display name (case-insensitive)
//   page   = 1-based page number (default 1, page size 20)
export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  // Pro-only feature gate
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
  const search = searchParams.get("search")?.trim().toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 20;

  const expenses = await prisma.transaction.findMany({
    where: { userId: payload.sub, transactionType: "EXPENSE" },
    select: { description: true, amount: true, category: true, date: true },
    orderBy: { date: "asc" },
  });

  if (expenses.length === 0) {
    return NextResponse.json({ total: 0, page: 1, pageSize, pages: 1, months: [], vendors: [] });
  }

  const monthKey = (d: Date) => d.toISOString().slice(0, 7);
  const allMonths = Array.from(new Set(expenses.map((e) => monthKey(e.date)))).sort();
  const months = allMonths.slice(-6);

  interface VendorGroup {
    name: string;
    totalSpent: number;
    txCount: number;
    categoryCounts: Map<string, number>;
    byMonth: Map<string, number>;
  }

  const groups = new Map<string, VendorGroup>();

  for (const tx of expenses) {
    const key = normalizeVendorName(tx.description);
    const amount = Math.abs(Number(tx.amount));
    let group = groups.get(key);
    if (!group) {
      group = {
        name: tx.description.trim(),
        totalSpent: 0,
        txCount: 0,
        categoryCounts: new Map(),
        byMonth: new Map(),
      };
      groups.set(key, group);
    }
    group.totalSpent += amount;
    group.txCount += 1;
    group.categoryCounts.set(tx.category, (group.categoryCounts.get(tx.category) ?? 0) + 1);

    const mKey = monthKey(tx.date);
    if (months.includes(mKey)) {
      group.byMonth.set(mKey, (group.byMonth.get(mKey) ?? 0) + amount);
    }
  }

  let vendors = Array.from(groups.entries()).map(([key, g]) => {
    const topCategory = [...g.categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ยังไม่จัดหมวดหมู่";
    const trend = months.map((m) => ({ month: m, amount: g.byMonth.get(m) ?? 0 }));

    const lastMonth = trend[trend.length - 1]?.amount ?? 0;
    const prevMonth = trend[trend.length - 2]?.amount ?? 0;
    // null = no previous-month spend to compare against (new or sporadic vendor)
    const trendPct = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 1000) / 10 : null;

    return {
      key,
      name: g.name,
      category: topCategory,
      totalSpent: Math.round(g.totalSpent * 100) / 100,
      txCount: g.txCount,
      trend,
      trendPct,
    };
  });

  if (search) {
    vendors = vendors.filter((v) => v.name.toLowerCase().includes(search));
  }

  vendors.sort((a, b) => b.totalSpent - a.totalSpent);

  const total = vendors.length;
  const pages = Math.ceil(total / pageSize) || 1;
  const paged = vendors.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({ total, page, pageSize, pages, months, vendors: paged });
}
