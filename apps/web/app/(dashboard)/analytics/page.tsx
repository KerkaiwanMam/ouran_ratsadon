"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/utils/format";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Types ───────────────────────────────────────────────────────────────────

interface DescriptiveSummary {
  months: {
    month: string;
    totalIncome: number;
    totalExpense: number;
    net: number;
    byCategory: { category: string; totalIncome: number; totalExpense: number; txCount: number }[];
  }[];
  computedAt: string | null;
}

interface DiagnosticInsight {
  id: string;
  month: string;
  category: string;
  insightType: string;
  summary: string;
  relatedTxIds: string[];
  createdAt: string;
}

interface ForecastSnapshot {
  id: string;
  forecastMonth: string;
  method: string;
  predictedNet: number;
  confidenceLow: number;
  confidenceHigh: number;
  cashRunwayMonths: number | null;
  inputWindow: { disclaimer?: string };
  generatedAt: string;
}

interface Recommendation {
  id: string;
  basedOn: string;
  basedOnId: string;
  action: string;
  priority: string;
  status: string;
  createdAt: string;
}

// ─── Small UI helpers ────────────────────────────────────────────────────────

function Panel({
  title,
  caption,
  children,
  className = "",
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden surface-glass rounded-2xl ${className}`}>
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        {caption && <p className="text-xs text-gray-400 mt-0.5">{caption}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400 py-6 text-center">{children}</p>;
}

function DeltaBadge({
  current,
  previous,
  invert = false,
}: {
  current: number;
  previous: number | null;
  /** true when an increase is bad news (e.g. expenses) */
  invert?: boolean;
}) {
  if (previous === null || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const up = pct >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
        good ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
      }`}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(pct).toFixed(0)}% จากเดือนก่อน
    </span>
  );
}

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function monthLabel(m: string) {
  const [y, mm] = m.split("-");
  const idx = parseInt(mm, 10) - 1;
  return `${THAI_MONTHS_SHORT[idx] ?? mm} ${y?.slice(2) ?? ""}`;
}

function compactBaht(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return `${v}`;
}

const insightTypeLabel: Record<string, string> = {
  category_spike: "ค่าใช้จ่ายพุ่งสูงผิดปกติ",
  new_vendor_surge: "ผู้ให้บริการ/รายการใหม่",
  seasonal_drop: "ลดลงผิดปกติ",
};

const insightTypeIcon: Record<string, React.ElementType> = {
  category_spike: TrendingUp,
  new_vendor_surge: Sparkles,
  seasonal_drop: TrendingDown,
};

const priorityStyle: Record<string, string> = {
  high: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  medium: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  low: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

const priorityLabel: Record<string, string> = { high: "สำคัญมาก", medium: "ควรดู", low: "ทั่วไป" };

const PIE_COLORS = ["#7F77DD", "#534AB7", "#1D9E75", "#EF9F27", "#E24B4A", "#9CA3AF"];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const summary = useSWR<DescriptiveSummary>("/api/business/analytics/summary?range=6", fetcher);
  const diagnostics = useSWR<{ insights: DiagnosticInsight[] }>(
    "/api/business/analytics/diagnose?limit=10",
    fetcher
  );
  const forecastQ = useSWR<{ snapshot: ForecastSnapshot | null }>(
    "/api/business/analytics/forecast",
    fetcher
  );
  const recommendations = useSWR<{ recommendations: Recommendation[] }>(
    "/api/business/analytics/recommendations?status=PENDING",
    fetcher
  );

  // Empty = focus the latest month; otherwise focus the chosen month for the
  // KPI cards, category breakdown and diagnostic panel. The trend chart always
  // shows the full range.
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const isLoading =
    summary.isLoading || diagnostics.isLoading || forecastQ.isLoading || recommendations.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={28} className="animate-spin mr-2" />
        กำลังวิเคราะห์ข้อมูล...
      </div>
    );
  }

  const months = summary.data?.months ?? [];
  // Months available for the filter dropdown — latest first.
  const availableMonths = months.map((m) => m.month).slice().reverse();
  // Resolve the focused month: explicit selection if it still exists in the
  // current range, otherwise fall back to the latest month.
  const focusIdx = (() => {
    if (selectedMonth) {
      const i = months.findIndex((m) => m.month === selectedMonth);
      if (i !== -1) return i;
    }
    return months.length - 1;
  })();
  const latest = months[focusIdx];
  const previous = focusIdx > 0 ? months[focusIdx - 1] : null;
  // Tie the diagnostic panel to the focused month so "why" matches the numbers.
  const insights = (diagnostics.data?.insights ?? []).filter(
    (i) => !latest || i.month === latest.month
  );
  const snapshot = forecastQ.data?.snapshot ?? null;
  const recs = recommendations.data?.recommendations ?? [];

  const chartData = months.map((m) => ({
    name: monthLabel(m.month),
    รายรับ: m.totalIncome,
    รายจ่าย: m.totalExpense,
    สุทธิ: m.net,
  }));

  const topCategories = latest
    ? [...latest.byCategory]
        .filter((c) => c.totalExpense > 0)
        .sort((a, b) => b.totalExpense - a.totalExpense)
        .slice(0, 6)
    : [];
  const maxCatExpense = topCategories[0]?.totalExpense ?? 1;

  // Layer 3 — Narrative: interpret the focused month's breakdown in one or two
  // plain-Thai sentences, derived from the governed summary (no LLM). Every
  // claim gets a drill-down so the user can verify it on /transactions.
  const focusMonthLabel = latest ? monthLabel(latest.month) : "";
  const narrativeSentences: string[] = [];
  let narrativeHref: string | undefined;
  if (latest && topCategories.length > 0 && latest.totalExpense > 0) {
    const top = topCategories[0];
    const share = (top.totalExpense / latest.totalExpense) * 100;
    const prevCat = previous?.byCategory.find((c) => c.category === top.category);
    const prevShare =
      previous && previous.totalExpense > 0 && prevCat
        ? (prevCat.totalExpense / previous.totalExpense) * 100
        : null;
    let sentence = `หมวด “${top.category}” คิดเป็น ${share.toFixed(0)}% ของรายจ่ายเดือน${focusMonthLabel} (${formatCurrency(top.totalExpense)})`;
    if (prevShare !== null && Math.abs(share - prevShare) >= 1) {
      sentence +=
        share > prevShare
          ? ` เพิ่มจาก ${prevShare.toFixed(0)}% เดือนก่อน`
          : ` ลดจาก ${prevShare.toFixed(0)}% เดือนก่อน`;
    }
    narrativeSentences.push(sentence);
    narrativeHref = `/transactions?category=${encodeURIComponent(top.category)}&month=${latest.month}`;
  }
  if (insights[0]) narrativeSentences.push(insights[0].summary);

  async function handleRecAction(id: string, status: "APPLIED" | "DISMISSED") {
    await fetch(`/api/business/analytics/recommendations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    recommendations.mutate();
  }

  async function handleRunForecast() {
    await fetch("/api/business/analytics/forecast", { method: "POST" });
    forecastQ.mutate();
    recommendations.mutate();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-gradient-accent">วิเคราะห์</span>{" "}
            <span className="text-gray-900 dark:text-gray-100">เชิงลึก</span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            ภาพรวมก่อน เจาะลึกทีหลัง — เกิดอะไรขึ้น ทำไม แนวโน้ม และควรทำอะไรต่อ
          </p>
        </div>
        {availableMonths.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">เดือนที่เจาะลึก</span>
            <select
              value={selectedMonth || (latest?.month ?? "")}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/30 cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {months.length === 0 ? (
        <Panel title="ยังไม่มีข้อมูล">
          <EmptyNote>
            ยังไม่มีข้อมูลเพียงพอ —{" "}
            <Link href="/upload" className="text-accent hover:underline">
              อัปโหลดไฟล์การเงินของคุณ
            </Link>{" "}
            เพื่อเริ่มวิเคราะห์
          </EmptyNote>
        </Panel>
      ) : (
        <>
          {/* ── Layer 3: Narrative summary (above the numbers) ─────────────── */}
          {narrativeSentences.length > 0 && (
            <section
              aria-label="สรุปเชิงลึก"
              className="relative overflow-hidden surface-glass rounded-2xl px-5 py-4"
            >
              <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-accent">
                  <Sparkles size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-accent mb-1">
                    สรุปเชิงลึก
                  </p>
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
                    {narrativeSentences.map((s, i) => (
                      <p key={i}>{s}</p>
                    ))}
                  </div>
                  {narrativeHref && (
                    <Link
                      href={narrativeHref}
                      className="text-xs text-accent hover:underline mt-2 inline-block"
                    >
                      ดูข้อมูลจริง →
                    </Link>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Overview KPI row ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden surface-glass rounded-2xl px-4 py-4">
              <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                สุทธิเดือนล่าสุด ({latest ? monthLabel(latest.month) : "—"})
              </p>
              <p
                className={`text-2xl font-black leading-none ${
                  (latest?.net ?? 0) >= 0
                    ? "text-gradient-accent w-fit"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatCurrency(latest?.net ?? 0)}
              </p>
              <div className="mt-1.5">
                <DeltaBadge current={latest?.net ?? 0} previous={previous?.net ?? null} />
              </div>
            </div>

            <div className="relative overflow-hidden surface-glass rounded-2xl px-4 py-4">
              <span className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500/60" aria-hidden="true" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">รายรับ</p>
              <p className="text-2xl font-black leading-none text-emerald-600 dark:text-emerald-400">
                {formatCurrency(latest?.totalIncome ?? 0)}
              </p>
              <div className="mt-1.5">
                <DeltaBadge
                  current={latest?.totalIncome ?? 0}
                  previous={previous?.totalIncome ?? null}
                />
              </div>
            </div>

            <div className="relative overflow-hidden surface-glass rounded-2xl px-4 py-4">
              <span className="absolute inset-x-0 top-0 h-0.5 bg-rose-500/60" aria-hidden="true" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">รายจ่าย</p>
              <p className="text-2xl font-black leading-none text-gray-900 dark:text-gray-100">
                {formatCurrency(latest?.totalExpense ?? 0)}
              </p>
              <div className="mt-1.5">
                <DeltaBadge
                  current={latest?.totalExpense ?? 0}
                  previous={previous?.totalExpense ?? null}
                  invert
                />
              </div>
            </div>

            <div className="relative overflow-hidden surface-glass rounded-2xl px-4 py-4">
              <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent opacity-40" aria-hidden="true" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">พยากรณ์เดือนถัดไป</p>
              {snapshot ? (
                <>
                  <p
                    className={`text-2xl font-black leading-none ${
                      snapshot.predictedNet >= 0
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(snapshot.predictedNet)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    เงินสดอยู่ได้อีก{" "}
                    {snapshot.cashRunwayMonths !== null ? `~${snapshot.cashRunwayMonths} เดือน` : "—"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-black leading-none text-gray-300 dark:text-gray-600">—</p>
                  <button
                    onClick={handleRunForecast}
                    className="text-[11px] text-accent hover:underline mt-1.5 cursor-pointer"
                  >
                    คำนวณการพยากรณ์ →
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Main trend chart + category breakdown ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel
              title="แนวโน้มรายรับ–รายจ่าย"
              caption="แท่ง = รายรับ/รายจ่ายต่อเดือน · เส้น = กระแสเงินสดสุทธิ"
              className="lg:col-span-2"
            >
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={compactBaht}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="รายรับ" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="รายจ่าย" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={26} />
                  <Line
                    type="monotone"
                    dataKey="สุทธิ"
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#22d3ee" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Panel>

            <Panel
              title="สัดส่วนค่าใช้จ่ายตามหมวดหมู่"
              caption={latest ? `เดือน ${monthLabel(latest.month)} — คลิกเพื่อดูรายการ` : ""}
            >
              {topCategories.length === 0 ? (
                <EmptyNote>ไม่มีรายจ่ายในเดือนล่าสุด</EmptyNote>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={topCategories.map((c) => ({ name: c.category, value: c.totalExpense }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={2}
                        onClick={(entry) =>
                          router.push(
                            `/transactions?category=${encodeURIComponent(entry.name as string)}&month=${latest?.month ?? ""}`
                          )
                        }
                      >
                        {topCategories.map((c, index) => (
                          <Cell
                            key={c.category}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                            className="cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <ul className="space-y-3.5 mt-1">
                    {topCategories.map((c, index) => (
                      <li key={c.category}>
                        <Link
                          href={`/transactions?category=${encodeURIComponent(c.category)}&month=${latest?.month ?? ""}`}
                          className="block group"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200 font-medium truncate group-hover:text-[#7F77DD] group-hover:underline">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                                aria-hidden="true"
                              />
                              {c.category}
                            </span>
                            <span className="text-gray-500 tabular-nums shrink-0 ml-2">
                              {formatCurrency(c.totalExpense)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-accent"
                              style={{ width: `${(c.totalExpense / maxCatExpense) * 100}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">{c.txCount} รายการ</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </div>

          {/* ── Detail: monthly table ──────────────────────────────────────── */}
          <Panel
            title="รายละเอียดรายเดือน (Descriptive)"
            caption="ตัวเลขเต็มของทุกเดือนที่วิเคราะห์ — คลิกหมวดในแดชบอร์ดเพื่อดูรายการ"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="py-2 pr-4 font-medium">เดือน</th>
                    <th className="py-2 pr-4 font-medium text-right">รายรับ</th>
                    <th className="py-2 pr-4 font-medium text-right">รายจ่าย</th>
                    <th className="py-2 font-medium text-right">สุทธิ</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr
                      key={m.month}
                      className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      onClick={() => router.push(`/transactions?month=${m.month}`)}
                    >
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-200 group-hover:text-[#7F77DD] group-hover:underline">
                        {monthLabel(m.month)}
                      </td>
                      <td className="py-2 pr-4 text-right text-emerald-600 tabular-nums">
                        {formatCurrency(m.totalIncome)}
                      </td>
                      <td className="py-2 pr-4 text-right text-red-500 tabular-nums">
                        {formatCurrency(m.totalExpense)}
                      </td>
                      <td
                        className={`py-2 text-right font-medium tabular-nums ${
                          m.net >= 0 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {formatCurrency(m.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* ── Detail: diagnostic + prescriptive side by side ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel
              title="ทำไมถึงเกิดขึ้น (Diagnostic)"
              caption={latest ? `ข้อสังเกตอัตโนมัติของเดือน ${monthLabel(latest.month)}` : "ข้อสังเกตอัตโนมัติ"}
            >
              {insights.length === 0 ? (
                <EmptyNote>ยังไม่พบความผิดปกติที่น่าสังเกตในเดือนล่าสุด</EmptyNote>
              ) : (
                <ul className="space-y-3">
                  {insights.map((insight) => {
                    const Icon = insightTypeIcon[insight.insightType] ?? AlertTriangle;
                    return (
                      <li key={insight.id}>
                        <Link
                          href={`/transactions?category=${encodeURIComponent(insight.category)}&month=${insight.month}`}
                          className="flex items-start gap-3 group"
                        >
                          <span className="mt-0.5 shrink-0 text-accent">
                            <Icon size={16} aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-0.5">
                              {insightTypeLabel[insight.insightType] ?? insight.insightType} ·{" "}
                              {insight.month}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-[#7F77DD] group-hover:underline">
                              {insight.summary}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel
              title="ควรทำอะไรต่อ (Prescriptive)"
              caption="คำแนะนำจาก rule engine — กดถูกเมื่อทำแล้ว"
            >
              {recs.length === 0 ? (
                <EmptyNote>ยังไม่มีคำแนะนำในขณะนี้ — ระบบจะแนะนำเมื่อพบสิ่งที่น่าสนใจ</EmptyNote>
              ) : (
                <ul className="space-y-3">
                  {recs.map((rec) => (
                    <li
                      key={rec.id}
                      className="flex items-start justify-between gap-3 border-b border-gray-50 dark:border-gray-700/50 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2.5">
                        <Lightbulb size={16} className="text-accent mt-0.5 shrink-0" aria-hidden="true" />
                        <div>
                          <span
                            className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-1 ${
                              priorityStyle[rec.priority] ?? priorityStyle.low
                            }`}
                          >
                            {priorityLabel[rec.priority] ?? rec.priority}
                          </span>
                          <p className="text-sm text-gray-700 dark:text-gray-200">{rec.action}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleRecAction(rec.id, "APPLIED")}
                          title="ดำเนินการแล้ว"
                          className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 size={16} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleRecAction(rec.id, "DISMISSED")}
                          title="ไม่สนใจ"
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                        >
                          <XCircle size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* ── Detail: forecast method ────────────────────────────────────── */}
          {snapshot && (
            <Panel title="รายละเอียดการพยากรณ์ (Predictive)">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400">เดือนที่พยากรณ์</p>
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {snapshot.forecastMonth}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">ช่วงความเป็นไปได้</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {formatCurrency(snapshot.confidenceLow)} ถึง {formatCurrency(snapshot.confidenceHigh)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <button
                    onClick={handleRunForecast}
                    className="text-xs font-medium text-accent hover:underline cursor-pointer"
                  >
                    คำนวณใหม่จากข้อมูลล่าสุด
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2 mt-3">
                วิธีคิด: {snapshot.inputWindow?.disclaimer ?? "ใช้ค่าเฉลี่ยถ่วงน้ำหนัก (WMA) — ไม่ใช่ AI"}
              </p>
            </Panel>
          )}
        </>
      )}

      <p className="text-xs text-gray-400 text-center pt-2">
        การพยากรณ์ทั้งหมดใช้ค่าเฉลี่ยถ่วงน้ำหนัก (Weighted Moving Average) และดัชนีฤดูกาล — ไม่ใช่ AI หรือ Machine
        Learning ใช้เพื่อประกอบการตัดสินใจเท่านั้น
      </p>
    </div>
  );
}
