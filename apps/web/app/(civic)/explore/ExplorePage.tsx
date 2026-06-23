"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import MinistryTreemap from "@/components/civic/MinistryTreemap";
import SunburstChart from "@/components/civic/SunburstChart";
import BudgetMapView from "@/components/civic/BudgetMapView";
import RedFlagBadge from "@/components/civic/RedFlagBadge";
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
      value: `฿${(data.totalBudget / 1e12).toFixed(2)}`,
      unit: "ล้านล้านบาท",
      tone: "accent" as const,
    },
    {
      label: "กระทรวง",
      value: `${data.ministryCount}`,
      unit: "หน่วยงาน",
      tone: "default" as const,
    },
    {
      label: "โครงการ",
      value: data.projectCount.toLocaleString(),
      unit: "โครงการ",
      tone: "default" as const,
    },
    {
      label: "ธงแดง",
      value: `${data.redFlagCount}`,
      unit: "โครงการ",
      tone: data.redFlagCount > 0 ? ("danger" as const) : ("default" as const),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-gradient-accent">งบอุ้มราษฎร</span>{" "}
            <span className="text-gray-900 dark:text-gray-100">Explorer</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            ผังเม็ดเงินงบประมาณแผ่นดิน ปีงบประมาณ{" "}
            <span className="font-semibold text-accent">พ.ศ. {year}</span>
            {" · "}
            <a
              href={`/api/civic/export/json?year=${year}`}
              className="text-accent-2 hover:underline inline-flex items-center gap-1"
            >
              <Download size={12} />
              ดาวน์โหลด JSON
            </a>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-accent/20 rounded-lg p-1">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => changeYear(y)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  y === year
                    ? "bg-gradient-accent text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-accent-soft"
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-accent/20 rounded-lg p-1">
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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                  view === mode
                    ? "bg-gradient-accent text-white"
                    : "text-gray-500 hover:bg-accent-soft"
                }`}
              >
                {icon}
                <span className="hidden lg:inline text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Search link */}
          <Link
            href={`/search?year=${year}`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-accent/20 rounded-lg bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-accent hover:text-accent transition-colors"
          >
            <Search size={14} />
            ค้นหาโครงการ
          </Link>
        </div>
      </div>

      {/* Stat cards — key numbers first, readable at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="relative overflow-hidden bg-white dark:bg-gray-900 border border-accent/15 rounded-xl px-4 py-3.5"
          >
            <span
              className={`absolute inset-x-0 top-0 h-0.5 ${
                s.tone === "danger" ? "bg-red-500" : "bg-gradient-accent"
              } ${s.tone === "default" ? "opacity-30" : ""}`}
              aria-hidden="true"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p
              className={`text-2xl font-black leading-none tracking-tight ${
                s.tone === "accent"
                  ? "text-gradient-accent w-fit"
                  : s.tone === "danger"
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {s.value}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">{s.unit}</p>
          </div>
        ))}
      </div>

      {/* Fiscal context bar */}
      <FiscalContextBar year={year} totalBudget={data.totalBudget} />

      {/* Main content */}
      {view === "treemap" && (
        <ViewPanel
          title="ผังเม็ดเงินตามกระทรวง"
          caption="ขนาดบล็อก = วงเงินงบประมาณ — คลิกเพื่อเจาะลึกถึงระดับโครงการ"
        >
          <MinistryTreemap
            ministries={data.ministries}
            fullData={data.ministriesWithDepts}
            year={year}
          />
        </ViewPanel>
      )}
      {view === "sunburst" && (
        <ViewPanel
          title="สัดส่วนงบประมาณแบบวงแหวน"
          caption="วงใน = กระทรวง · วงนอก = หน่วยงานในสังกัด"
        >
          <SunburstChart ministries={data.ministriesWithDepts} year={year} />
        </ViewPanel>
      )}
      {view === "map" && (
        <ViewPanel
          title="งบประมาณรายจังหวัด"
          caption="ความเข้มของสี = วงเงินที่ลงพื้นที่จังหวัดนั้น"
        >
          <BudgetMapView provinces={provinces} year={year} />
        </ViewPanel>
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

// ─── View panel wrapper ───────────────────────────────────────────────────────

function ViewPanel({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-accent/15 rounded-2xl">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{caption}</p>
      </div>
      <div className="p-4">{children}</div>
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
    <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-accent/15 rounded-2xl">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 text-left border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 w-12 text-center">
              #
            </th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              กระทรวง
            </th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 text-right">
              งบประมาณ (พันล้านบาท)
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
            .map((m, rank) => (
              <tr
                key={m.id}
                className="hover:bg-accent-soft/40 transition-colors"
              >
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      rank < 3
                        ? "bg-accent-soft text-accent"
                        : "text-gray-400"
                    }`}
                  >
                    {rank + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/ministry/${m.id}?year=${year}`}
                    className="font-medium hover:text-accent transition-colors"
                  >
                    {m.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {m.departmentCount} หน่วยงาน
                  </p>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                  {(m.budget / 1e9).toLocaleString("th-TH", { maximumFractionDigits: 1 })}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-accent"
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
