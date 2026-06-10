import { NextResponse } from "next/server";
import {
  getBudgetYear,
  computeMinistryList,
  computeMinistryWithDepts,
  computeTotalRedFlags,
  computeProjectCount,
} from "@/lib/civic-cache";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year } = await params;
  const data = getBudgetYear(year);

  if (!data) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `ไม่พบข้อมูลปีงบประมาณ ${year}` },
      { status: 404 }
    );
  }

  const ministries = computeMinistryList(data);
  const redFlagCount = computeTotalRedFlags(data);
  const projectCount = computeProjectCount(data);

  return NextResponse.json({
    fiscalYear: data.fiscal_year,
    totalBudget: data.total_budget,
    ministryCount: ministries.length,
    projectCount,
    redFlagCount,
    ministries,
    ministriesWithDepts: computeMinistryWithDepts(data),
    metadata: data.metadata,
  });
}
