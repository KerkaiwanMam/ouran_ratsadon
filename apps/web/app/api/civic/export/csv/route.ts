import { NextRequest, NextResponse } from "next/server";
import { getBudgetYear, searchProjects } from "@/lib/civic-cache";
import type { SearchFilters, BudgetType } from "@/types/civic";

// GET /api/civic/export/csv?... (same query params as /api/civic/search)
// Exports the *full filtered result set* (not just the current page) as CSV
// for the "ดาวน์โหลดผลลัพธ์เป็น CSV" action on /search.
// UTF-8 BOM is prepended so Thai text opens correctly in Excel.
export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const p = url.searchParams;

  const year = p.get("year") ?? "2568";
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
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
  };

  const results = searchProjects(data, filters);

  const header = [
    "ชื่อโครงการ",
    "กระทรวง",
    "งบประมาณ (บาท)",
    "เปลี่ยนแปลงจากปีก่อน (%)",
    "จังหวัด",
    "ประเภทงบ",
    "สถานะ",
  ];

  const escapeCsv = (value: string | number) => {
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = results.map((r) => [
    r.name,
    r.ministryName,
    r.amount,
    r.changePct,
    r.province,
    r.budgetType,
    r.flags.length > 0 ? r.flags.map((f) => f.label).join(" | ") : "ปกติ",
  ]);

  const csv =
    "﻿" +
    [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="search-results-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
