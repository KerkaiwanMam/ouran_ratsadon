"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Minus,
  Info,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FiscalRow {
  fiscalYear: string;
  totalRevenue: number;
  totalExpenditure: number;
  balance: number;
  publicDebt: number;
  gdpEstimate: number | null;
  debtToGdpPct: number | null;
  source: string;
  sourceNotes: string | null;
}

type RangeKey = "5Y" | "10Y" | "All";
type OverlayKey = "revenue" | "expenditure" | "debt";

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} ล้านล้าน`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} พันล้าน`;
  return `${n.toLocaleString("th-TH")} ล้าน`;
}

function fmtAxis(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}ล้านล.`;
  if (Math.abs(n) >= 1_000)     return `${Math.round(n / 1_000).toLocaleString()}พันล.`;
  return `${n.toLocaleString()}ล.`;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Custom crosshair tooltip ─────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 text-sm min-w-[220px]">
      <p className="font-bold text-gray-700 dark:text-gray-200 mb-2">ปีงบประมาณ {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-500 dark:text-gray-400">{p.name}</span>
          </span>
          <span className="font-semibold tabular-nums" style={{ color: p.color }}>
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  trend,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  color: string;
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-green-500"
      : trend === "down"
      ? "text-red-500"
      : "text-gray-400";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <TrendIcon size={14} className={trendColor} />
      </div>
      <p className="text-xl font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FiscalOverviewPage() {
  const { data: resp, isLoading, error } = useSWR<{ data: FiscalRow[] }>(
    "/api/civic/fiscal",
    fetcher
  );

  const [range, setRange] = useState<RangeKey>("10Y");
  const [overlays, setOverlays] = useState<Set<OverlayKey>>(
    new Set(["revenue", "expenditure", "debt"])
  );

  const allRows = resp?.data ?? [];

  // Filter by selected range
  const rows = useMemo(() => {
    if (!allRows.length) return [];
    const sorted = [...allRows].sort((a, b) =>
      a.fiscalYear.localeCompare(b.fiscalYear)
    );
    if (range === "All") return sorted;
    const n = range === "5Y" ? 5 : 10;
    return sorted.slice(-n);
  }, [allRows, range]);

  const latest = rows[rows.length - 1];
  const prev   = rows[rows.length - 2];

  function toggleOverlay(key: OverlayKey) {
    setOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── colors ──
  const C = {
    revenue:     "#22C55E",  // green
    expenditure: "#7F77DD",  // purple (brand)
    balance:     "#F59E0B",  // amber
    debt:        "#EF4444",  // red
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        กำลังโหลดข้อมูลการคลัง…
      </div>
    );
  }

  if (error || !rows.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        ไม่สามารถโหลดข้อมูลการคลังได้
      </div>
    );
  }

  const deficitSurplus =
    latest.balance >= 0
      ? { label: "เกินดุล", color: "#22C55E", trend: "up" as const }
      : { label: "ขาดดุล", color: "#EF4444", trend: "down" as const };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* ── Page header ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-2">
            <Link href="/" className="hover:text-[#7F77DD] transition-colors">หน้าแรก</Link>
            <span>/</span>
            <span className="text-gray-600 dark:text-gray-300">ภาพรวมการคลังประเทศ</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ภาพรวมการคลังประเทศไทย
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            รายได้ · รายจ่าย · ดุลงบประมาณ · หนี้สาธารณะ — ปีงบประมาณ{" "}
            {rows[0]?.fiscalYear}–{latest?.fiscalYear}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── 4-stat strip for latest year ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            ปีงบประมาณ {latest.fiscalYear} (ล่าสุด)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="รายได้รัฐบาล"
              value={fmt(latest.totalRevenue)}
              sub={prev ? `+${(((latest.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100).toFixed(1)}% จากปีก่อน` : undefined}
              trend="up"
              color={C.revenue}
            />
            <StatCard
              label="รายจ่ายงบประมาณ"
              value={fmt(latest.totalExpenditure)}
              sub={prev ? `+${(((latest.totalExpenditure - prev.totalExpenditure) / prev.totalExpenditure) * 100).toFixed(1)}% จากปีก่อน` : undefined}
              trend="up"
              color={C.expenditure}
            />
            <StatCard
              label={`ดุลงบประมาณ (${deficitSurplus.label})`}
              value={fmt(Math.abs(latest.balance))}
              sub={latest.gdpEstimate ? `${((Math.abs(latest.balance) / latest.gdpEstimate) * 100).toFixed(1)}% ของ GDP` : undefined}
              trend={deficitSurplus.trend}
              color={deficitSurplus.color}
            />
            <StatCard
              label="หนี้สาธารณะ"
              value={fmt(latest.publicDebt)}
              sub={latest.debtToGdpPct ? `${latest.debtToGdpPct}% ต่อ GDP` : undefined}
              trend="down"
              color={C.debt}
            />
          </div>
        </div>

        {/* ── Chart card ── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
          {/* Chart toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              แนวโน้มหลายปี
            </h2>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Range selector */}
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 text-xs font-medium">
                {(["5Y", "10Y", "All"] as RangeKey[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      range === r
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Overlay toggles */}
              <div className="flex items-center gap-1.5 text-xs">
                {(
                  [
                    { key: "revenue" as OverlayKey,     label: "รายได้",        color: C.revenue },
                    { key: "expenditure" as OverlayKey, label: "รายจ่าย",       color: C.expenditure },
                    { key: "debt" as OverlayKey,        label: "หนี้สาธารณะ",  color: C.debt },
                  ] as { key: OverlayKey; label: string; color: string }[]
                ).map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => toggleOverlay(key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all font-medium ${
                      overlays.has(key)
                        ? "border-transparent text-white"
                        : "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-transparent"
                    }`}
                    style={overlays.has(key) ? { backgroundColor: color } : undefined}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={rows} margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                strokeOpacity={0.6}
                vertical={false}
              />
              <XAxis
                dataKey="fiscalYear"
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                axisLine={{ stroke: "#E5E7EB" }}
                tickLine={false}
                tickFormatter={(v: string) => `ปี ${v}`}
              />
              <YAxis
                yAxisId="main"
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtAxis}
                width={72}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                iconType="circle"
              />

              {/* Balance as a bar (can be negative) */}
              <Bar
                yAxisId="main"
                dataKey="balance"
                name="ดุลงบประมาณ"
                fill={C.balance}
                fillOpacity={0.5}
                radius={[3, 3, 0, 0]}
              />

              {/* Revenue line */}
              {overlays.has("revenue") && (
                <Line
                  yAxisId="main"
                  type="monotone"
                  dataKey="totalRevenue"
                  name="รายได้รัฐบาล"
                  stroke={C.revenue}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: C.revenue, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              )}

              {/* Expenditure line */}
              {overlays.has("expenditure") && (
                <Line
                  yAxisId="main"
                  type="monotone"
                  dataKey="totalExpenditure"
                  name="รายจ่ายงบประมาณ"
                  stroke={C.expenditure}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: C.expenditure, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              )}

              {/* Public debt line */}
              {overlays.has("debt") && (
                <Line
                  yAxisId="main"
                  type="monotone"
                  dataKey="publicDebt"
                  name="หนี้สาธารณะ"
                  stroke={C.debt}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ r: 3, fill: C.debt, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              )}

              {/* Zero line for balance reference */}
              <ReferenceLine yAxisId="main" y={0} stroke="#D1D5DB" strokeDasharray="4 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ── Debt-to-GDP card ── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">
            หนี้สาธารณะ / GDP (%)
          </h2>
          <div className="space-y-2">
            {[...rows].reverse().map((r) => {
              const pct = r.debtToGdpPct ?? 0;
              const legal = 70; // กรอบวินัยการคลัง ≤ 70% GDP
              const barColor =
                pct >= 65
                  ? "#EF4444"
                  : pct >= 55
                  ? "#F59E0B"
                  : "#22C55E";
              return (
                <div key={r.fiscalYear} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-10 shrink-0 text-right tabular-nums">
                    {r.fiscalYear}
                  </span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-4 overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(pct / legal) * 100}%`, backgroundColor: barColor }}
                    />
                    {/* 70% cap marker */}
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-red-300 dark:bg-red-700" />
                  </div>
                  <span
                    className="text-xs font-semibold tabular-nums w-12 shrink-0"
                    style={{ color: barColor }}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-red-300" />
              เส้นขวาสุด = กรอบวินัยการคลัง 70% ของ GDP
            </p>
          </div>
        </div>

        {/* ── Data table ── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              ตารางข้อมูลรายปี
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                  {["ปี", "รายได้", "รายจ่าย", "ดุลงบ", "หนี้สาธารณะ", "หนี้/GDP"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...rows].reverse().map((r) => {
                  const surplus = r.balance >= 0;
                  return (
                    <tr
                      key={r.fiscalYear}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                        {r.fiscalYear}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-green-600 dark:text-green-400">
                        {fmt(r.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#7F77DD]">
                        {fmt(r.totalExpenditure)}
                      </td>
                      <td
                        className={`px-4 py-3 tabular-nums font-medium ${
                          surplus
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {surplus ? "+" : ""}
                        {fmt(r.balance)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-red-500 dark:text-red-400">
                        {fmt(r.publicDebt)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-500 dark:text-gray-400">
                        {r.debtToGdpPct != null ? `${r.debtToGdpPct}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Source citation ── */}
        <div className="flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3">
          <Info size={13} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">แหล่งข้อมูล: </span>
            สำนักงานเศรษฐกิจการคลัง (สศค.) · สำนักงานบริหารหนี้สาธารณะ (สบน.) ·
            สำนักงบประมาณ · สศช. — ข้อมูลสาธารณะ | รายจ่ายคือวงเงินงบประมาณที่อนุมัติ
            ไม่ใช่รายจ่ายจริง |{" "}
            <a
              href="/explore"
              className="text-[#7F77DD] hover:underline inline-flex items-center gap-0.5"
            >
              ดูรายละเอียดการจัดสรรงบรายกระทรวง
              <ArrowUpRight size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
