import { NextResponse } from "next/server";
import { getAvailableYears, getBudgetYear } from "@/lib/civic-cache";

export function GET() {
  const years = getAvailableYears();
  const current = years[years.length - 1] ?? "2568";
  const data = getBudgetYear(current);

  return NextResponse.json({
    years,
    current,
    last_updated: data?.metadata.parsed_at ?? null,
  });
}
