"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import MinistryTreemap from "@/components/civic/MinistryTreemap";
import SunburstChart from "@/components/civic/SunburstChart";
import BudgetMapView from "@/components/civic/BudgetMapView";
import StatStrip from "@/components/civic/StatStrip";
import RedFlagBadge from "@/components/civic/RedFlagBadge";
import { formatCurrency } from "@/utils/format";
import type { BudgetYearSummary, MinistryListItem } from "@/types/civic";
import type { ProvinceData } from "@/lib/civic-cache";
import Link from "next/link";
import { Search, Download, LayoutGrid, Table2, PieChart, Map, TrendingDown, ArrowUpRight } from "lucide-react";

// ─── Fiscal context bar ───────────────────────────────────────────────────────

interface FiscalRow {
  fiscalYear: string;
  totalRevenue: number;
  totalExpenditure: number;
  balance: number;
  publicDebt: number;
  debtToGdpPct: number | null;
}

const fiscalFetcher = (url: string) => fetch(url).then((r) => r.json());

function FiscalContextBar({ year, totalBudget }: { year: string; totalBudget: number }) {
  const { data } = useSWR<{ data: FiscalRow[] }>("/api/civic/fiscal", fiscalFetcher);
  const row = data?.data?.find((r) => r.fiscalYear === year);
  if (!row) return null;

  const revPct = ((totalBudget / 1e6) / row.totalRevenue * 100).toFixed(1);
  const isDeficit = row.balance < 0;
  const deficitBn = (Math.abs(row.balance) / 1000).toFixed(0);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 mb-4">
      <span className="flex items-center gap-1">
        <TrendingDown size={12} />
        <strong>บริบทการคลัง ปี {year}:</strong>
      </span>
      <span>
        งบรายจ่ายนี้ คิดเป็น <strong>{revPct}%</strong> ของรายได้รัฐบาล
        ({(row.totalRevenue / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} พันล้านบาท)
      </span>
      {isDeficit && (
        <span>
          ·&nbsp;
          <span className="text-red-600 dark:text-red-400 font-medium">
            ขาดดุล {parseInt(deficitBn).toLocaleString()} พันล้านบาท
          </span>
        </span>
      )}
      {row.debtToGdpPct != null && (
        <span>· หนี้สาธารณะ <strong>{row.debtToGdpPct}%</strong> ของ GDP</span>
      )}
      <Link
        href="/fiscal-overview"
        className="ml-auto flex items-center gap-0.5 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 transition-colors shrink-0"
      >
        ดูภาพรวมการคลัง <ArrowUpRight size={11} />
      </Link>
    </div>
  );
}

type ViewMode = "treemap" | "sunburst" | "map" | "table";

interface Props {
  data: BudgetYearSummary;
  availableYears: string[];
  provinces: ProvinceData[];
}

export default function ExplorePage({ data, availableYears, provinces }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  // Years now come from getAvailableYears() (server side, scans the data/
  // directory) instead of a hardcoded ["2566","2567","2568"] list — that
  // list both 404'd on years with no data file and silently omitted newly
  // uploaded years (e.g. 2569). Fall back to the summary's own year if for
  // some reason the list comes back empty.
  const years = availableYears.length > 0 ? availableYears : [data.fiscalYear];
  const year = params.get("year") ?? data.fiscalYear;
  const [view, setView] = useState<ViewMode>("treemap");

  function changeYear(y: string) {
    router.push(`/explore?year=${y}`);
  }

  const stats = [
    {
      label: "งบประมาณรวม",
      value: `฿${(data.totalBudget / 1e12).toFixed(2)} ล้านล้าน`,
      highlight: true,
    },
    {
      label: "กระทรวง",
      value: `${data.ministryCount} หน่วยงาน`,
    },
    {
      label: "โครงการ",
      value: `${data.projectCount.toLocaleString()} โครงการ`,
    },
    {
      label: "ธงแดง",
      value: `${data.redFlagCount} โครงการ`,
      danger: data.redFlagCount > 0,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            งบอุ้มราษฎร Explorer
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            ปีงบประมาณ{" "}
            <span className="font-medium text-gray-800 dark:text-gray-200">
              พ.ศ. {year}
            </span>
            {" · "}
            <a
              href={`/api/civic/export/json?year=${year}`}
              className="text-[#7F77DD] hover:underline inline-flex items-center gap-1"
            >
              <Download size={12} />
              ดาวน์โหลด JSON
            </a>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => changeYear(y)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  y === year
                    ? "bg-[#7F77DD] text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            {(
              [
                { mode: "treemap", icon: <LayoutGrid size={16} />, label: "Treemap" },
                { mode: "sunburst", icon: <PieChart size={16} />, label: "Sunburst" },
                { mode: "map", icon: <Map size={16} />, label: "แผนที่" },
                { mode: "table", icon: <Table2 size={16} />, label: "ตาราง" },
              ] as const
            ).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                title={label}
                className={`p-1.5 rounded-md transition-colors ${
                  view === mode
                    ? "bg-[#7F77DD] text-white"
                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Search link */}
          <Link
            href={`/search?year=${year}`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-[#7F77DD] hover:text-[#7F77DD] transition-colors"
          >
            <Search size={14} />
            ค้นหาโครงการ
          </Link>
        </div>
      </div>

      {/* Stat strip */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 mb-4">
        <StatStrip stats={stats} />
      </div>

      {/* Fiscal context bar */}
      <FiscalContextBar year={year} totalBudget={data.totalBudget} />

      {/* Main content */}
      {view === "treemap" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <MinistryTreemap
            ministries={data.ministries}
            fullData={data.ministriesWithDepts}
            year={year}
          />
        </div>
      )}
      {view === "sunburst" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <SunburstChart ministries={data.ministriesWithDepts} year={year} />
        </div>
      )}
      {view === "map" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <BudgetMapView provinces={provinces} year={year} />
        </div>
      )}
      {view === "table" && (
        <MinistryTable ministries={data.ministries} year={year} />
      )}

      {/* Data source */}
      <p className="text-xs text-gray-400 mt-4 text-center">
        แหล่งข้อมูล: พ.ร.บ. งบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ. {year} •{" "}
        เผยแพร่เพื่อความโปร่งใสโดย ouran_ratsadon
      </p>
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

function MinistryTable({
  ministries,
  year,
}: {
  ministries: MinistryListItem[];
  year: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 text-left border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              กระทรวง
            </th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 text-right">
              งบประมาณ
            </th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 text-right">
              สัดส่วน
            </th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 text-right">
              โครงการ
            </th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              สถานะ
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {[...ministries]
            .sort((a, b) => b.budget - a.budget)
            .map((m) => (
              <tr
                key={m.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/ministry/${m.id}?year=${year}`}
                    className="font-medium hover:text-[#7F77DD]"
                  >
                    {m.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {m.departmentCount} หน่วยงาน
                  </p>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  ฿{(m.budget / 1e9).toFixed(1)}B
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-[#7F77DD]"
                        style={{ width: `${Math.min(m.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {m.percentage.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {m.projectCount}
                </td>
                <td className="px-4 py-3">
                  {m.redFlagCount > 0 ? (
                    <RedFlagBadge severity="warning" label={`${m.redFlagCount} ธง`} />
                  ) : (
                    <span className="text-xs text-gray-400">ปกติ</span>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
