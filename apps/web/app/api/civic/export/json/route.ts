import { NextRequest, NextResponse } from "next/server";
import { getBudgetYear } from "@/lib/civic-cache";

// GET /api/civic/export/json?year=2568
// Open-data download: returns the full source-of-truth budget dataset for a
// fiscal year as a downloadable JSON file (Civic Layer is public, no auth).
export async function GET(request: NextRequest) {
  const year = request.nextUrl.searchParams.get("year");

  if (!year) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "กรุณาระบุปีงบประมาณ (year)" },
      { status: 400 }
    );
  }

  const data = getBudgetYear(year);

  if (!data) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `ไม่พบข้อมูลงบประมาณปี ${year}` },
      { status: 404 }
    );
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="budget-${year}.json"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
