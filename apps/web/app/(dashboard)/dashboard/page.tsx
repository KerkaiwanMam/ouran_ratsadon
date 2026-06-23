"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/utils/format";
import StatusBadge from "@/components/shared/StatusBadge";
import SpendingPieChart from "@/components/charts/SpendingPieChart";
import BudgetVsActual from "@/components/business/BudgetVsActual";
import BudgetAlertBanner from "@/components/business/BudgetAlertBanner";
import {
  KpiCardsSkeleton,
  ChartPanelSkeleton,
  TableSkeleton,
} from "@/components/shared/Skeleton";
import Link from "next/link";
import {
  Upload,
  ArrowUpRight,
  Lightbulb,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TrendSummary {
  months: { month: string; totalIncome: number; totalExpense: number; net: number }[];
}

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function trendMonthLabel(m: string) {
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

interface DashboardTransaction {
  id: string;
  description: string;
  category: string;
  amount: number;
  transactionType: "INCOME" | "EXPENSE";
  date: string;
  leakFlag: "NONE" | "SPIKE" | "DUPLICATE" | "OUTLIER" | "CREEP";
  leakSeverity: "CRITICAL" | "WARNING" | "INFO" | null;
  leakReason: string | null;
}

interface DashboardCategory {
  name: string;
  amount: number;
  percentage: number;
  trendPct: number;
  isNew: boolean;
  budgetAmount: number | null;
}

interface TopLeak {
  id: string;
  description: string;
  category: string;
  amount: number;
  leakFlag: "SPIKE" | "DUPLICATE" | "OUTLIER" | "CREEP";
  leakSeverity: "CRITICAL" | "WARNING" | "INFO" | null;
  leakReason: string | null;
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

interface Recommendation {
  id: string;
  basedOn: string;
  basedOnId: string;
  action: string;
  priority: string;
  status: string;
  createdAt: string;
}

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

interface DashboardResponse {
  hasData: boolean;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    burnRate: number;
    period: string | null;
    categories: DashboardCategory[];
    cashRunwayMonths: number | null;
    topLeak: TopLeak | null;
    isPro: boolean;
  };
  transactions: DashboardTransaction[];
}

const LEAK_LABELS: Record<string, string> = {
  SPIKE: "ค่าใช้จ่ายพุ่งสูง",
  DUPLICATE: "รายการซ้ำ/เปลี่ยนแปลง",
  OUTLIER: "ค่าผิดปกติ",
  CREEP: "ค่าใช้จ่ายไต่ระดับ",
};

function formatPeriod(period: string | null) {
  if (!period) return "";
  const [, month] = period.split("-");
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  const idx = parseInt(month, 10) - 1;
  return thaiMonths[idx] ? `เดือน${thaiMonths[idx]}` : period;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, error, mutate } = useSWR<DashboardResponse>(
    "/api/business/dashboard",
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
  const trend = useSWR<TrendSummary>("/api/business/analytics/summary?range=6", fetcher);
  const diagnostics = useSWR<{ insights: DiagnosticInsight[] }>(
    "/api/business/analytics/diagnose?limit=3",
    fetcher
  );
  const recommendations = useSWR<{ recommendations: Recommendation[] }>(
    "/api/business/analytics/recommendations?status=PENDING",
    fetcher
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartPanelSkeleton className="lg:col-span-2" />
          <ChartPanelSkeleton />
        </div>
        <div className="surface-glass rounded-2xl overflow-hidden">
          <TableSkeleton rows={6} cols={5} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-24 text-gray-400">
        ไม่สามารถโหลดข้อมูลแดชบอร์ดได้ กรุณาลองใหม่อีกครั้ง
      </div>
    );
  }

  if (!data.hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Upload size={40} className="text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">
          ยังไม่มีข้อมูลทางการเงิน
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          อัปโหลดไฟล์ของคุณเพื่อเริ่มดูแดชบอร์ดและตรวจจับความผิดปกติ
        </p>
        <Link
          href="/upload"
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-[#7F77DD] text-white rounded-lg hover:bg-[#534AB7] transition-colors"
        >
          <Upload size={14} />
          อัปโหลดไฟล์แรกของคุณ
        </Link>
      </div>
    );
  }

  const { totalIncome, totalExpense, netCashFlow, burnRate, categories, period, cashRunwayMonths, topLeak, isPro } = data.summary;
  const transactions = data.transactions;

  const pieData = categories.map((c) => ({
    name: c.name,
    value: c.amount,
  }));

  const trendMonths = trend.data?.months ?? [];
  const curMonth = trendMonths[trendMonths.length - 1] ?? null;
  const prevMonth = trendMonths.length > 1 ? trendMonths[trendMonths.length - 2] : null;
  const comparisonData = curMonth
    ? [
        { name: "รายรับ", เดือนนี้: curMonth.totalIncome, เดือนก่อน: prevMonth?.totalIncome ?? 0 },
        { name: "รายจ่าย", เดือนนี้: curMonth.totalExpense, เดือนก่อน: prevMonth?.totalExpense ?? 0 },
        { name: "สุทธิ", เดือนนี้: curMonth.net, เดือนก่อน: prevMonth?.net ?? 0 },
      ]
    : [];

  const anomalyCount = transactions.filter((t) => t.leakFlag !== "NONE").length;
  const criticalCount = transactions.filter((t) => t.leakSeverity === "CRITICAL").length;
  const spendRate = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const topCategory = categories.length > 0
    ? [...categories].sort((a, b) => b.amount - a.amount)[0]
    : null;

  // Narrative summary card — use the most relevant diagnostic insight if one
  // exists, otherwise fall back to a sentence computed from this month vs
  // last month's expense trend.
  const insights = diagnostics.data?.insights ?? [];
  const topInsight = insights[0] ?? null;
  const recs = recommendations.data?.recommendations ?? [];

  let NarrativeIcon: React.ElementType = Sparkles;
  let narrativeText = "";
  let narrativeHref: string | null = null;

  if (topInsight) {
    NarrativeIcon = insightTypeIcon[topInsight.insightType] ?? AlertTriangle;
    narrativeText = topInsight.summary;
    narrativeHref = `/transactions?category=${encodeURIComponent(topInsight.category)}&month=${topInsight.month}`;
  } else if (curMonth && prevMonth && prevMonth.totalExpense > 0) {
    const diff = curMonth.totalExpense - prevMonth.totalExpense;
    const pct = (diff / prevMonth.totalExpense) * 100;
    NarrativeIcon = diff > 0 ? TrendingUp : TrendingDown;
    narrativeText =
      diff > 0
        ? `เดือนนี้ค่าใช้จ่ายเพิ่มขึ้น ${pct.toFixed(0)}% จากเดือนก่อน (+${formatCurrency(Math.abs(diff))})`
        : `เดือนนี้ค่าใช้จ่ายลดลง ${Math.abs(pct).toFixed(0)}% จากเดือนก่อน (-${formatCurrency(Math.abs(diff))})`;
  } else {
    NarrativeIcon = netCashFlow >= 0 ? TrendingUp : TrendingDown;
    narrativeText = `กระแสเงินสดสุทธิเดือนนี้${netCashFlow >= 0 ? "เป็นบวก" : "เป็นลบ"}ที่ ${formatCurrency(
      Math.abs(netCashFlow)
    )}`;
  }

  async function handleRecAction(id: string, status: "APPLIED" | "DISMISSED") {
    await fetch(`/api/business/analytics/recommendations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    recommendations.mutate();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-gradient-accent">แดชบอร์ด</span>{" "}
            <span className="text-gray-900 dark:text-gray-100">การเงิน</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatPeriod(period)} 2568 (ข้อมูลจริงของคุณ)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/upload"
            className="flex items-center gap-1.5 text-sm px-3.5 py-2 bg-gradient-accent text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Upload size={14} />
            อัปโหลดไฟล์เพิ่ม
          </Link>
        </div>
      </div>

      {/* Budget threshold alert — over/near-budget categories (PRO), surfaced
          first so the user catches overspend before scanning the numbers. */}
      <BudgetAlertBanner categories={categories} period={period} isPro={isPro} />

      {/* KPI row — net cash flow leads, supporting numbers follow */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Primary: net cash flow */}
        <div className="relative overflow-hidden col-span-2 surface-glass rounded-2xl px-5 py-4">
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            กระแสเงินสดสุทธิ (รายรับ − รายจ่าย)
          </p>
          <p
            className={`text-3xl font-black leading-none tracking-tight ${
              netCashFlow >= 0
                ? "text-gradient-accent w-fit"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {netCashFlow >= 0 ? "+" : "−"}
            {formatCurrency(Math.abs(netCashFlow))}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              รับ {formatCurrency(totalIncome)}
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              จ่าย {formatCurrency(totalExpense)}
            </span>
          </div>
        </div>

        {/* Spending rate */}
        <div className="relative overflow-hidden surface-glass rounded-2xl px-4 py-4">
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent opacity-30" aria-hidden="true" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">อัตราการใช้จ่าย</p>
          <p
            className={`text-2xl font-black leading-none ${
              spendRate > 100
                ? "text-red-600 dark:text-red-400"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {totalIncome > 0 ? `${spendRate.toFixed(0)}%` : "—"}
          </p>
          <div className="mt-2.5 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                spendRate > 100 ? "bg-red-500" : "bg-gradient-accent"
              }`}
              style={{ width: `${totalIncome > 0 ? Math.min(spendRate, 100) : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 truncate">
            {topCategory
              ? `สูงสุด: ${topCategory.name} (${topCategory.percentage.toFixed(0)}%)`
              : "ของรายรับทั้งหมด"}
          </p>
        </div>

        {/* Anomalies */}
        <Link
          href="/analytics"
          className="relative overflow-hidden surface-glass rounded-2xl px-4 py-4 group cursor-pointer"
        >
          <span
            className={`absolute inset-x-0 top-0 h-0.5 ${
              anomalyCount > 0 ? "bg-red-500" : "bg-gradient-accent opacity-30"
            }`}
            aria-hidden="true"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">รายการผิดปกติ</p>
          <p
            className={`text-2xl font-black leading-none ${
              anomalyCount > 0
                ? "text-red-600 dark:text-red-400"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {anomalyCount}
            <span className="text-sm font-normal text-gray-400 ml-1">รายการ</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {criticalCount > 0 ? `วิกฤต ${criticalCount} รายการ · ` : ""}
            <span className="text-accent group-hover:underline">ดูการวิเคราะห์ →</span>
          </p>
        </Link>
      </div>

      {/* Secondary KPI row — burn rate, cash runway (Pro), top leak */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Burn rate */}
        <div className="relative overflow-hidden surface-glass rounded-2xl px-4 py-4">
          <span
            className={`absolute inset-x-0 top-0 h-0.5 ${
              burnRate > 0 ? "bg-red-500" : "bg-gradient-accent opacity-30"
            }`}
            aria-hidden="true"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">อัตราการเผาเงินสด (เดือนนี้)</p>
          <p
            className={`text-2xl font-black leading-none ${
              burnRate > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {burnRate > 0 ? `−${formatCurrency(burnRate)}` : "฿0"}
          </p>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {burnRate > 0 ? "รายจ่ายมากกว่ารายรับเดือนนี้" : "กระแสเงินสดเป็นบวก — ไม่มีการเผาเงินสด"}
          </p>
        </div>

        {/* Cash runway — Pro */}
        {isPro ? (
          <Link
            href="/forecast"
            className="relative overflow-hidden surface-glass rounded-2xl px-4 py-4 group cursor-pointer"
          >
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">เงินสดอยู่ได้อีก (Runway)</p>
            {cashRunwayMonths !== null ? (
              <p
                className={`text-2xl font-black leading-none ${
                  cashRunwayMonths <= 3
                    ? "text-red-600 dark:text-red-400"
                    : cashRunwayMonths <= 6
                    ? "text-amber-500"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                ~{cashRunwayMonths}
                <span className="text-sm font-normal text-gray-400 ml-1">เดือน</span>
              </p>
            ) : (
              <p className="text-2xl font-black leading-none text-gray-300 dark:text-gray-600">—</p>
            )}
            <p className="text-[11px] text-gray-400 mt-1.5">
              <span className="text-accent group-hover:underline">
                {cashRunwayMonths !== null ? "ดูการพยากรณ์ →" : "คำนวณการพยากรณ์ →"}
              </span>
            </p>
          </Link>
        ) : (
          <Link
            href="/upgrade"
            className="relative overflow-hidden surface-glass rounded-2xl px-4 py-4 group cursor-pointer"
          >
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent opacity-30" aria-hidden="true" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">เงินสดอยู่ได้อีก (Runway)</p>
            <p className="text-2xl font-black leading-none text-gray-300 dark:text-gray-600">—</p>
            <p className="text-[11px] mt-1.5">
              <span className="text-accent group-hover:underline">ปลดล็อกด้วย Pro →</span>
            </p>
          </Link>
        )}

        {/* Top leak */}
        {topLeak ? (
          <Link
            href={`/transactions?leakFlag=${topLeak.leakFlag}`}
            className="relative overflow-hidden surface-glass rounded-2xl px-4 py-4 group cursor-pointer"
          >
            <span
              className={`absolute inset-x-0 top-0 h-0.5 ${
                topLeak.leakSeverity === "CRITICAL" ? "bg-red-500" : "bg-amber-400"
              }`}
              aria-hidden="true"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              สิ่งที่ควรดูก่อน: {LEAK_LABELS[topLeak.leakFlag] ?? topLeak.leakFlag}
            </p>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
              {topLeak.description}
            </p>
            <p className="text-[11px] text-gray-400 mt-1.5 truncate">
              {formatCurrency(Math.abs(topLeak.amount))} ·{" "}
              <span className="text-accent group-hover:underline">ดูรายการ →</span>
            </p>
          </Link>
        ) : (
          <div className="relative overflow-hidden surface-glass rounded-2xl px-4 py-4">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent opacity-30" aria-hidden="true" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">สิ่งที่ควรดูก่อน</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">ไม่พบรายการผิดปกติ</p>
            <p className="text-[11px] text-gray-400 mt-1.5">เดือนนี้ยังไม่มีรายการที่ต้องตรวจสอบ</p>
          </div>
        )}
      </div>

      {/* 6-month trend + current-vs-previous-month comparison */}
      {(trend.data?.months?.length ?? 0) >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="relative overflow-hidden surface-glass rounded-2xl lg:col-span-2">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">แนวโน้มกระแสเงินสด 6 เดือน</h3>
                <p className="text-xs text-gray-400 mt-0.5">รายรับ (เขียว) เทียบรายจ่าย (ชมพู)</p>
              </div>
              <Link
                href="/analytics"
                className="text-xs text-accent hover:underline inline-flex items-center gap-0.5"
              >
                วิเคราะห์เชิงลึก
                <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart
                  data={trend.data!.months.map((m) => ({
                    name: trendMonthLabel(m.month),
                    รายรับ: m.totalIncome,
                    รายจ่าย: m.totalExpense,
                  }))}
                >
                  <defs>
                    <linearGradient id="dash-income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dash-expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={compactBaht}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
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
                  <Area type="monotone" dataKey="รายรับ" stroke="#10b981" strokeWidth={2} fill="url(#dash-income)" />
                  <Area type="monotone" dataKey="รายจ่าย" stroke="#fb7185" strokeWidth={2} fill="url(#dash-expense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Current vs previous month comparison */}
          <div className="relative overflow-hidden surface-glass rounded-2xl">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent opacity-60" aria-hidden="true" />
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold">เดือนนี้ vs เดือนก่อน</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {curMonth ? trendMonthLabel(curMonth.month) : ""}
                {prevMonth ? ` เทียบกับ ${trendMonthLabel(prevMonth.month)}` : ""}
              </p>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={comparisonData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={compactBaht}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
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
                  <Bar dataKey="เดือนก่อน" fill="#9CA3AF" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="เดือนนี้" fill="#7F77DD" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <BudgetVsActual
            categories={categories}
            period={period}
            onBudgetSaved={() => mutate()}
          />
          <SpendingPieChart
            data={pieData}
            onSliceClick={(name) => router.push(`/transactions?category=${encodeURIComponent(name)}`)}
          />
        </div>
      )}

      {/* Transactions */}
      <div className="relative surface-glass rounded-2xl overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold">รายการล่าสุด</h3>
          <Link href="/transactions" className="text-xs text-accent hover:underline inline-flex items-center gap-0.5">
            ดูทั้งหมด {transactions.length} รายการ
            <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  รายการ
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  หมวดหมู่
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 text-right">
                  จำนวนเงิน
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  สถานะ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={
                    tx.leakFlag !== "NONE"
                      ? () => router.push(`/transactions?leakFlag=${tx.leakFlag}`)
                      : undefined
                  }
                  className={
                    tx.leakSeverity === "CRITICAL"
                      ? "bg-red-50 dark:bg-red-900/10 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20"
                      : tx.leakFlag !== "NONE"
                      ? "bg-amber-50 dark:bg-amber-900/10 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/20"
                      : ""
                  }
                >
                  <td className="px-4 py-3">
                    <p className="text-gray-900 dark:text-gray-100">{tx.description}</p>
                    {tx.leakReason && (
                      <p className="text-xs text-gray-400 mt-0.5">{tx.leakReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{tx.category}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-medium ${
                      tx.transactionType === "INCOME"
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {tx.transactionType === "INCOME" ? "+" : ""}
                    {formatCurrency(Math.abs(tx.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={
                        tx.leakSeverity === "CRITICAL"
                          ? "ผิดปกติ"
                          : tx.leakFlag !== "NONE"
                          ? "ตรวจสอบ"
                          : "ปกติ"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Narrative summary + Actionable Today — secondary context, below the
          recent transactions so the headline numbers come first */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div className="relative overflow-hidden surface-glass rounded-2xl px-5 py-4">
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-accent">
              <NarrativeIcon size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1">สรุปสถานการณ์</p>
              <p className="text-sm text-gray-700 dark:text-gray-200">{narrativeText}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                {narrativeHref && (
                  <Link href={narrativeHref} className="text-xs text-accent hover:underline inline-block">
                    ดูรายการที่เกี่ยวข้อง →
                  </Link>
                )}
                <Link href="/assistant" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                  <Sparkles size={11} aria-hidden="true" />
                  ถาม AI เพิ่มเติม
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden surface-glass rounded-2xl">
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent opacity-60" aria-hidden="true" />
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-bold">ทำวันนี้ได้เลย</h3>
            <Link href="/analytics" className="text-xs text-accent hover:underline inline-flex items-center gap-0.5">
              ดูทั้งหมด
              <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </div>
          <div className="p-4">
            {recs.length === 0 ? (
              <p className="text-sm text-gray-400 py-2 text-center">ยังไม่มีคำแนะนำในขณะนี้</p>
            ) : (
              <ul className="space-y-3">
                {recs.slice(0, 3).map((rec) => (
                  <li key={rec.id} className="flex items-start justify-between gap-3">
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
          </div>
        </div>
      </div>
    </div>
  );
}
