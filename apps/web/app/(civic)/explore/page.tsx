import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getBudgetYear,
  getAvailableYears,
  computeMinistryList,
  computeMinistryWithDepts,
  computeTotalRedFlags,
  computeProjectCount,
  getProvinceData,
} from "@/lib/civic-cache";
import type { BudgetYearSummary } from "@/types/civic";
import ExplorePage from "./ExplorePage";

export const metadata = {
  title: "งบอุ้มราษฎร Explorer — ouran_ratsadon",
  description: "สำรวจงบประมาณแผ่นดินไทย แบบ Interactive Treemap พร้อมระบบตรวจจับ Red Flag",
};

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

async function ExploreContent({ year }: { year: string }) {
  const data = getBudgetYear(year);
  if (!data) notFound();

  const ministries = computeMinistryList(data);
  const summary: BudgetYearSummary = {
    fiscalYear: data.fiscal_year,
    totalBudget: data.total_budget,
    ministryCount: ministries.length,
    projectCount: computeProjectCount(data),
    redFlagCount: computeTotalRedFlags(data),
    ministries,
    ministriesWithDepts: computeMinistryWithDepts(data),
  };
  const provinces = getProvinceData(data);

  return <ExplorePage data={summary} availableYears={getAvailableYears()} provinces={provinces} />;
}

export default async function Page({ searchParams }: PageProps) {
  const { year: requestedYear } = await searchParams;
  // Default to the most recent fiscal year actually on disk rather than a
  // hardcoded "2568" — otherwise newly-uploaded years (e.g. 2569) never show
  // up on /explore unless the user manually appends ?year=2569 to the URL.
  const availableYears = getAvailableYears();
  const latestYear = availableYears[availableYears.length - 1] ?? "2568";
  const year = requestedYear ?? latestYear;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
          กำลังโหลดข้อมูล...
        </div>
      }
    >
      <ExploreContent year={year} />
    </Suspense>
  );
}
