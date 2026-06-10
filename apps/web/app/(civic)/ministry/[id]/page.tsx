import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getBudgetYear,
  getAvailableYears,
  computeMinistryWithDepts,
  getAllProjects,
} from "@/lib/civic-cache";
import RedFlagBadge from "@/components/civic/RedFlagBadge";
import { ChevronRight, Search, Download, TrendingUp, AlertTriangle } from "lucide-react";
import type { BudgetTypeBreakdown } from "@/types/civic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { year } = await searchParams;
  const latestYear = getAvailableYears().at(-1) ?? "2568";
  const data = getBudgetYear(year ?? latestYear);
  if (!data) return { title: "ไม่พบข้อมูล" };
  const ministries = computeMinistryWithDepts(data);
  const ministry = ministries.find((m) => m.id === id);
  if (!ministry) return { title: "ไม่พบกระทรวง" };
  return {
    title: `${ministry.name} — งบประมาณ พ.ศ. ${year ?? latestYear}`,
    description: `วงเงิน ฿${(ministry.budget / 1e9).toFixed(1)} พันล้านบาท · ${ministry.departmentCount} หน่วยงาน · ${ministry.projectCount.toLocaleString()} โครงการ`,
  };
}

const BUDGET_TYPE_LABELS: Record<keyof BudgetTypeBreakdown, string> = {
  personnel: "งบบุคลากร",
  operating: "งบดำเนินงาน",
  investment: "งบลงทุน",
  other: "รายจ่ายอื่น",
};
const BUDGET_TYPE_COLORS: Record<keyof BudgetTypeBreakdown, string> = {
  personnel: "#7F77DD",
  operating: "#EF9F27",
  investment: "#1D9E75",
  other: "#94A3B8",
};

function formatBudget(n: number): string {
  if (n >= 1e12) return `฿${(n / 1e12).toFixed(2)} ล้านล้าน`;
  if (n >= 1e9) return `฿${(n / 1e9).toFixed(1)} พันล้าน`;
  if (n >= 1e6) return `฿${(n / 1e6).toFixed(0)} ล้าน`;
  return `฿${n.toLocaleString("th-TH")}`;
}

export default async function MinistryDetailPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { year } = await searchParams;
  const latestYear = getAvailableYears().at(-1) ?? "2568";
  const resolvedYear = year ?? latestYear;
  const availableYears = getAvailableYears();

  const data = getBudgetYear(resolvedYear);
  if (!data) notFound();

  const ministries = computeMinistryWithDepts(data);
  const ministry = ministries.find((m) => m.id === id);
  if (!ministry) notFound();

  // Top red-flag projects in this ministry
  const allProjects = getAllProjects(data).filter((p) => p.ministryId === id);
  const flaggedProjects = allProjects
    .filter((p) => p.flags.length > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // Budget type totals across all departments
  const totalBudgetTypes: BudgetTypeBreakdown = ministry.departments.reduce(
    (acc, d) => ({
      personnel: acc.personnel + d.budgetTypes.personnel,
      operating: acc.operating + d.budgetTypes.operating,
      investment: acc.investment + d.budgetTypes.investment,
      other: acc.other + d.budgetTypes.other,
    }),
    { personnel: 0, operating: 0, investment: 0, other: 0 }
  );

  // Sorted departments
  const sortedDepts = [...ministry.departments].sort((a, b) => b.budget - a.budget);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* ── Breadcrumb ─────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5 flex-wrap">
        <Link href="/explore" className="hover:text-[#7F77DD]">Explorer</Link>
        <ChevronRight size={14} className="text-gray-300" />
        <Link href={`/explore?year=${resolvedYear}`} className="hover:text-[#7F77DD]">
          ปีงบประมาณ {resolvedYear}
        </Link>
        <ChevronRight size={14} className="text-gray-300" />
        <span className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-xs">
          {ministry.name}
        </span>
      </nav>

      {/* ── Header card ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            {/* Year selector */}
            <div className="flex items-center gap-1 mb-3">
              {availableYears.map((y) => (
                <Link
                  key={y}
                  href={`/ministry/${encodeURIComponent(id)}?year=${y}`}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    y === resolvedYear
                      ? "bg-[#7F77DD] text-white"
                      : "text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">
              {ministry.name}
            </h1>
            <p className="text-sm text-gray-500">
              งบประมาณ พ.ศ. {resolvedYear}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/search?year=${resolvedYear}&q=${encodeURIComponent(ministry.name)}`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-[#7F77DD] hover:text-[#7F77DD] transition-colors"
            >
              <Search size={14} />
              ค้นหาโครงการ
            </Link>
            <a
              href={`/api/civic/export/csv?year=${resolvedYear}&ministry=${encodeURIComponent(id)}`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-[#7F77DD] hover:text-[#7F77DD] transition-colors"
            >
              <Download size={14} />
              CSV
            </a>
          </div>
        </div>

        {/* ── Key stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-xs text-gray-500 mb-1">งบประมาณรวม</p>
            <p className="text-xl font-bold text-[#7F77DD]">
              {formatBudget(ministry.budget)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {ministry.percentage.toFixed(2)}% ของงบประมาณแผ่นดิน
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">หน่วยงาน</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {ministry.departmentCount}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">สำนัก / กรม</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">โครงการ</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {ministry.projectCount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">รายการ</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">ธงแดง</p>
            <p className={`text-xl font-bold ${ministry.redFlagCount > 0 ? "text-red-500" : "text-gray-800 dark:text-gray-100"}`}>
              {ministry.redFlagCount}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">โครงการผิดปกติ</p>
          </div>
        </div>

        {/* ── Budget type breakdown ──────────────────────────────── */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            สัดส่วนประเภทค่าใช้จ่าย
          </p>
          {/* Stacked bar */}
          <div className="flex rounded-full overflow-hidden h-3 mb-3 gap-0.5">
            {(Object.keys(BUDGET_TYPE_LABELS) as Array<keyof BudgetTypeBreakdown>)
              .filter((k) => totalBudgetTypes[k] > 0)
              .map((k) => {
                const pct = (totalBudgetTypes[k] / ministry.budget) * 100;
                return (
                  <div
                    key={k}
                    title={`${BUDGET_TYPE_LABELS[k]}: ${pct.toFixed(1)}%`}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: BUDGET_TYPE_COLORS[k],
                    }}
                  />
                );
              })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(Object.keys(BUDGET_TYPE_LABELS) as Array<keyof BudgetTypeBreakdown>)
              .filter((k) => totalBudgetTypes[k] > 0)
              .map((k) => {
                const pct = (totalBudgetTypes[k] / ministry.budget) * 100;
                return (
                  <div key={k} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: BUDGET_TYPE_COLORS[k] }}
                    />
                    <span className="text-gray-600 dark:text-gray-300">
                      {BUDGET_TYPE_LABELS[k]}
                    </span>
                    <span className="text-gray-400">{pct.toFixed(1)}%</span>
                    <span className="text-gray-400">({formatBudget(totalBudgetTypes[k])})</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Department table ───────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                สำนัก / กรม ({ministry.departmentCount})
              </h2>
              <span className="text-xs text-gray-400">เรียงตามงบประมาณ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                      ชื่อหน่วยงาน
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                      งบประมาณ
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                      สัดส่วน
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {sortedDepts.map((d) => {
                    const pct = ministry.budget > 0 ? (d.budget / ministry.budget) * 100 : 0;
                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/search?year=${resolvedYear}&q=${encodeURIComponent(d.name)}`}
                            className="font-medium text-gray-800 dark:text-gray-200 hover:text-[#7F77DD] line-clamp-1"
                          >
                            {d.name}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {d.projectCount.toLocaleString()} โครงการ
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-200">
                            {formatBudget(d.budget)}
                          </p>
                          {/* Budget type mini-bar */}
                          <div className="flex gap-px rounded-full overflow-hidden h-1.5 mt-1 w-24 ml-auto">
                            {(Object.keys(BUDGET_TYPE_LABELS) as Array<keyof BudgetTypeBreakdown>)
                              .filter((k) => d.budgetTypes[k] > 0)
                              .map((k) => (
                                <div
                                  key={k}
                                  title={BUDGET_TYPE_LABELS[k]}
                                  style={{
                                    flex: d.budgetTypes[k],
                                    backgroundColor: BUDGET_TYPE_COLORS[k],
                                  }}
                                />
                              ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-[#7F77DD]"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-9 text-right tabular-nums">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {d.redFlagCount > 0 ? (
                            <RedFlagBadge severity="warning" label={`${d.redFlagCount} ธง`} />
                          ) : (
                            <span className="text-xs text-gray-400">ปกติ</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right column ──────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Red flag projects */}
          {flaggedProjects.length > 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  โครงการที่มีธงแดง ({ministry.redFlagCount})
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {flaggedProjects.map((p, i) => (
                  <Link
                    key={`${p.id}-${i}`}
                    href={`/project/${encodeURIComponent(p.id)}?year=${resolvedYear}`}
                    className="flex flex-col gap-0.5 group"
                  >
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-[#7F77DD] line-clamp-2 leading-snug">
                      {p.flags.length > 0 && (
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 shrink-0" />
                      )}
                      {p.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">
                        {formatBudget(p.amount)}
                      </span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400 truncate">
                        {p.departmentName}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              {ministry.redFlagCount > flaggedProjects.length && (
                <Link
                  href={`/search?year=${resolvedYear}&q=${encodeURIComponent(ministry.name)}&status=red_flag`}
                  className="mt-3 flex items-center gap-1 text-xs text-[#7F77DD] hover:underline"
                >
                  ดูทั้งหมด {ministry.redFlagCount} โครงการ
                  <ChevronRight size={12} />
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={15} className="text-teal-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  ไม่พบโครงการที่ผิดปกติ
                </h2>
              </div>
              <p className="text-xs text-gray-400">
                ไม่มีโครงการที่ถูกระบุว่ามีความผิดปกติทางงบประมาณในปีนี้
              </p>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              ลิงก์ด่วน
            </h2>
            <div className="flex flex-col gap-2">
              <Link
                href={`/search?year=${resolvedYear}&q=${encodeURIComponent(ministry.name)}`}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#7F77DD] transition-colors"
              >
                <Search size={13} className="shrink-0" />
                ค้นหาโครงการทั้งหมด ({ministry.projectCount.toLocaleString()})
              </Link>
              <Link
                href={`/search?year=${resolvedYear}&q=${encodeURIComponent(ministry.name)}&status=red_flag`}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#7F77DD] transition-colors"
              >
                <AlertTriangle size={13} className="shrink-0" />
                เฉพาะโครงการที่มีธงแดง
              </Link>
              <Link
                href={`/explore?year=${resolvedYear}`}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#7F77DD] transition-colors"
              >
                <TrendingUp size={13} className="shrink-0" />
                กลับไปภาพรวมทั้งหมด
              </Link>
            </div>
          </div>

          {/* Data source */}
          <p className="text-xs text-gray-400 text-center">
            แหล่งข้อมูล: พ.ร.บ. งบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ. {resolvedYear}
            <br />
            เผยแพร่เพื่อความโปร่งใส โดย ouran_ratsadon
          </p>
        </div>
      </div>
    </div>
  );
}
