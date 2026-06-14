"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { formatCurrency } from "@/utils/format";
import {
  Loader2,
  ClipboardCheck,
  CheckCircle2,
  Circle,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  LineChart,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Archive,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

// "สิ่งที่ต้องตรวจสอบ" — the Prescriptive tier (Tier 4) lifted out of /analytics
// into a dedicated investigation checklist. Each item is a rule-engine
// recommendation the user works through like a checklist; expanding a card
// reveals the Evidence (Layer 2): the diagnostic that triggered it plus the
// governed expense statistics from /analytics, with a drill-down to the real
// transactions. Reviewing an item persists its status (APPLIED) so progress
// survives reloads.

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Types (mirror the analytics endpoints) ─────────────────────────────────

interface MonthSummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  byCategory: { category: string; totalIncome: number; totalExpense: number; txCount: number }[];
}
interface DiagnosticInsight {
  id: string;
  month: string;
  category: string;
  insightType: string;
  summary: string;
  relatedTxIds: string[];
}
interface ForecastSnapshot {
  id: string;
  forecastMonth: string;
  predictedNet: number;
  confidenceLow: number;
  confidenceHigh: number;
  cashRunwayMonths: number | null;
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

type StatusFilter = "ALL" | "PENDING" | "APPLIED" | "DISMISSED";

// ─── Static maps ────────────────────────────────────────────────────────────

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
function monthLabel(m: string) {
  const [y, mm] = m.split("-");
  const idx = parseInt(mm, 10) - 1;
  const be = y ? Number(y) + 543 : "";
  return `${THAI_MONTHS_SHORT[idx] ?? mm} ${String(be).slice(2)}`;
}

const PRIORITY_META: Record<string, { label: string; ring: string; chip: string }> = {
  high: {
    label: "สำคัญมาก",
    ring: "border-l-red-500",
    chip: "bg-red-50 text-red-600 dark:bg-red-900/25 dark:text-red-300",
  },
  medium: {
    label: "ควรดู",
    ring: "border-l-amber-500",
    chip: "bg-amber-50 text-amber-600 dark:bg-amber-900/25 dark:text-amber-300",
  },
  low: {
    label: "ทั่วไป",
    ring: "border-l-gray-300 dark:border-l-gray-600",
    chip: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300",
  },
};

const INSIGHT_META: Record<string, { label: string; icon: React.ElementType }> = {
  category_spike: { label: "ค่าใช้จ่ายพุ่งสูงผิดปกติ", icon: TrendingUp },
  new_vendor_surge: { label: "ผู้ให้บริการ/รายการใหม่", icon: Sparkles },
  seasonal_drop: { label: "ลดลงผิดปกติ", icon: TrendingDown },
};

const BASED_ON_META: Record<string, { label: string; icon: React.ElementType }> = {
  diagnostic: { label: "จากการวินิจฉัยความผิดปกติ", icon: AlertTriangle },
  forecast: { label: "จากการพยากรณ์กระแสเงินสด", icon: LineChart },
  leak: { label: "จากการตรวจจับเงินรั่วไหล", icon: Droplets },
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ActionItemsPage() {
  const recsQ = useSWR<{ recommendations: Recommendation[] }>(
    "/api/business/analytics/recommendations",
    fetcher
  );
  const diagQ = useSWR<{ insights: DiagnosticInsight[] }>(
    "/api/business/analytics/diagnose?limit=50",
    fetcher
  );
  const summaryQ = useSWR<{ months: MonthSummary[] }>(
    "/api/business/analytics/summary?range=12",
    fetcher
  );
  const forecastQ = useSWR<{ snapshot: ForecastSnapshot | null }>(
    "/api/business/analytics/forecast",
    fetcher
  );

  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  const loading = recsQ.isLoading || diagQ.isLoading || summaryQ.isLoading;

  const recs = recsQ.data?.recommendations ?? [];
  const insights = diagQ.data?.insights ?? [];
  const months = summaryQ.data?.months ?? [];
  const snapshot = forecastQ.data?.snapshot ?? null;

  // Review progress (dismissed items are set aside, not counted against you).
  const active = recs.filter((r) => r.status !== "DISMISSED");
  const reviewed = recs.filter((r) => r.status === "APPLIED").length;
  const pct = active.length > 0 ? Math.round((reviewed / active.length) * 100) : 0;

  const counts = {
    ALL: recs.length,
    PENDING: recs.filter((r) => r.status === "PENDING").length,
    APPLIED: reviewed,
    DISMISSED: recs.filter((r) => r.status === "DISMISSED").length,
  };

  const visible =
    filter === "ALL" ? recs : recs.filter((r) => r.status === filter);
  // PENDING first, then by priority, applied/dismissed sink down.
  const statusRank: Record<string, number> = { PENDING: 0, APPLIED: 1, DISMISSED: 2 };
  const prioRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const ordered = [...visible].sort(
    (a, b) =>
      (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) ||
      (prioRank[a.priority] ?? 9) - (prioRank[b.priority] ?? 9)
  );

  function toggleOpen(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function setStatus(id: string, status: "APPLIED" | "DISMISSED" | "PENDING") {
    setBusy(id);
    try {
      await fetch(`/api/business/analytics/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await recsQ.mutate();
    } finally {
      setBusy(null);
    }
  }

  async function recompute() {
    setRecomputing(true);
    try {
      await fetch("/api/business/analytics/recommendations", { method: "POST" });
      await recsQ.mutate();
    } finally {
      setRecomputing(false);
    }
  }

  /** Build the Evidence shown when a card is expanded. */
  function evidenceFor(rec: Recommendation) {
    if (rec.basedOn === "diagnostic") {
      const d = insights.find((i) => i.id === rec.basedOnId);
      if (!d) return { kind: "diagnostic" as const, d: null };
      const mi = months.findIndex((m) => m.month === d.month);
      const monthEntry = mi >= 0 ? months[mi] : null;
      const catEntry = monthEntry?.byCategory.find((c) => c.category === d.category) ?? null;
      const expense = catEntry?.totalExpense ?? 0;
      const txCount = catEntry?.txCount ?? d.relatedTxIds.length;
      const share =
        monthEntry && monthEntry.totalExpense > 0
          ? (expense / monthEntry.totalExpense) * 100
          : null;
      const prevEntry = mi > 0 ? months[mi - 1] : null;
      const prevCat = prevEntry?.byCategory.find((c) => c.category === d.category) ?? null;
      const deltaPct =
        prevCat && prevCat.totalExpense > 0
          ? ((expense - prevCat.totalExpense) / prevCat.totalExpense) * 100
          : null;
      return {
        kind: "diagnostic" as const,
        d,
        expense,
        txCount,
        share,
        deltaPct,
        href: `/transactions?category=${encodeURIComponent(d.category)}&month=${d.month}`,
      };
    }
    return { kind: "forecast" as const, snapshot };
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-accent text-white shrink-0">
              <ClipboardCheck size={19} aria-hidden="true" />
            </span>
            <span className="text-gray-900 dark:text-gray-100">สิ่งที่ต้องตรวจสอบ</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            รายการที่ระบบสะกิดจากความผิดปกติของรายจ่าย — ตรวจทีละข้อ กดยืนยันเมื่อดูครบแล้ว
          </p>
        </div>
        <button
          onClick={recompute}
          disabled={recomputing}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-accent hover:text-accent transition-colors cursor-pointer disabled:opacity-50"
        >
          {recomputing ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw size={15} aria-hidden="true" />
          )}
          คำนวณรายการใหม่
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 size={26} className="animate-spin mr-2" />
          กำลังโหลดรายการตรวจสอบ...
        </div>
      ) : recs.length === 0 ? (
        <EmptyState onRecompute={recompute} recomputing={recomputing} />
      ) : (
        <>
          {/* ── Progress ──────────────────────────────────────────────────── */}
          <div className="relative overflow-hidden surface-glass rounded-2xl px-5 py-4">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                ความคืบหน้าการตรวจสอบ
              </p>
              <p className="text-sm tabular-nums">
                <span className="font-bold text-gradient-accent">{reviewed}</span>
                <span className="text-gray-400"> / {active.length} รายการ</span>
              </p>
            </div>
            <div
              className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="ความคืบหน้าการตรวจสอบ"
            >
              <div
                className="h-full rounded-full bg-gradient-accent transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {active.length > 0 && reviewed === active.length && (
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={13} aria-hidden="true" />
                ตรวจสอบครบทุกรายการแล้ว
              </p>
            )}
          </div>

          {/* ── Filter tabs ───────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {([
              ["ALL", "ทั้งหมด"],
              ["PENDING", "ค้างตรวจสอบ"],
              ["APPLIED", "ตรวจสอบแล้ว"],
              ["DISMISSED", "พักไว้"],
            ] as [StatusFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  filter === key
                    ? "bg-[#7F77DD] text-white border-[#7F77DD]"
                    : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-accent hover:text-accent"
                }`}
              >
                {label}
                <span className={`ml-1.5 tabular-nums ${filter === key ? "text-white/80" : "text-gray-400"}`}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          {/* ── Checklist ─────────────────────────────────────────────────── */}
          {ordered.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">
              ไม่มีรายการในหมวดนี้
            </p>
          ) : (
            <ul className="space-y-3">
              {ordered.map((rec) => {
                const isOpen = open.has(rec.id);
                const isDone = rec.status === "APPLIED";
                const isDismissed = rec.status === "DISMISSED";
                const prio = PRIORITY_META[rec.priority] ?? PRIORITY_META.low;
                const ev = evidenceFor(rec);
                const basedMeta = BASED_ON_META[rec.basedOn] ?? BASED_ON_META.diagnostic;
                const BasedIcon = basedMeta.icon;

                return (
                  <li
                    key={rec.id}
                    className={`surface-glass rounded-2xl border-l-4 ${prio.ring} overflow-hidden transition-opacity ${
                      isDismissed ? "opacity-55" : ""
                    }`}
                  >
                    {/* Collapsed row */}
                    <div className="flex items-start gap-3 p-4">
                      {/* Checkbox = mark reviewed / re-open */}
                      <button
                        onClick={() => setStatus(rec.id, isDone ? "PENDING" : "APPLIED")}
                        disabled={busy === rec.id}
                        aria-pressed={isDone}
                        aria-label={isDone ? "ยกเลิกการตรวจสอบ" : "ทำเครื่องหมายว่าตรวจสอบแล้ว"}
                        className="mt-0.5 shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {busy === rec.id ? (
                          <Loader2 size={22} className="animate-spin text-gray-400" aria-hidden="true" />
                        ) : isDone ? (
                          <CheckCircle2 size={22} className="text-emerald-500" aria-hidden="true" />
                        ) : (
                          <Circle
                            size={22}
                            className="text-gray-300 dark:text-gray-600 hover:text-accent transition-colors"
                            aria-hidden="true"
                          />
                        )}
                      </button>

                      {/* Title + meta — clicking toggles the evidence */}
                      <button
                        onClick={() => toggleOpen(rec.id)}
                        aria-expanded={isOpen}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${prio.chip}`}>
                            {prio.label}
                          </span>
                          {ev.kind === "diagnostic" && ev.d && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                              <span className="font-medium text-gray-500 dark:text-gray-300">
                                {ev.d.category}
                              </span>
                              · {monthLabel(ev.d.month)}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm leading-relaxed ${
                            isDone
                              ? "text-gray-400 dark:text-gray-500"
                              : "text-gray-800 dark:text-gray-100"
                          } ${isOpen ? "" : "line-clamp-2"}`}
                        >
                          {rec.action}
                        </p>
                      </button>

                      {/* Chevron */}
                      <button
                        onClick={() => toggleOpen(rec.id)}
                        aria-label={isOpen ? "ย่อรายละเอียด" : "ดูรายละเอียด"}
                        className="mt-0.5 shrink-0 text-gray-400 hover:text-accent transition-colors cursor-pointer"
                      >
                        <ChevronDown
                          size={18}
                          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    {/* Expanded evidence */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 ml-[34px] border-t border-gray-100 dark:border-gray-800 space-y-4">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent pt-3">
                          <BasedIcon size={13} aria-hidden="true" />
                          {basedMeta.label}
                        </p>

                        {ev.kind === "diagnostic" && ev.d ? (
                          <>
                            {/* The "why" */}
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                              {(() => {
                                const im = INSIGHT_META[ev.d.insightType];
                                const Icon = im?.icon ?? AlertTriangle;
                                return (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                    <Icon size={13} aria-hidden="true" />
                                    {im?.label ?? ev.d.insightType}
                                  </span>
                                );
                              })()}
                              <br />
                              {ev.d.summary}
                            </p>

                            {/* Stats grid (governed numbers from /analytics) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <Stat label="ค่าใช้จ่ายหมวดนี้" value={formatCurrency(ev.expense)} />
                              <Stat label="จำนวนรายการ" value={`${ev.txCount} รายการ`} />
                              <Stat
                                label="สัดส่วนของเดือน"
                                value={ev.share !== null ? `${ev.share.toFixed(0)}%` : "—"}
                              />
                              <Stat
                                label="เทียบเดือนก่อน"
                                value={
                                  ev.deltaPct !== null ? (
                                    <span
                                      className={`inline-flex items-center gap-0.5 ${
                                        ev.deltaPct >= 0
                                          ? "text-red-500 dark:text-red-400"
                                          : "text-emerald-600 dark:text-emerald-400"
                                      }`}
                                    >
                                      {ev.deltaPct >= 0 ? (
                                        <ArrowUpRight size={14} />
                                      ) : (
                                        <ArrowDownRight size={14} />
                                      )}
                                      {Math.abs(ev.deltaPct).toFixed(0)}%
                                    </span>
                                  ) : (
                                    "—"
                                  )
                                }
                              />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <Link
                                href={ev.href}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                              >
                                <ExternalLink size={14} aria-hidden="true" />
                                ดูรายการจริง ({ev.txCount} รายการ)
                              </Link>
                              <ActionButtons
                                rec={rec}
                                busy={busy === rec.id}
                                onSet={setStatus}
                              />
                            </div>
                          </>
                        ) : ev.kind === "forecast" && ev.snapshot ? (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <Stat
                                label={`พยากรณ์ ${monthLabel(ev.snapshot.forecastMonth)}`}
                                value={formatCurrency(ev.snapshot.predictedNet)}
                              />
                              <Stat
                                label="เงินสดอยู่ได้อีก"
                                value={
                                  ev.snapshot.cashRunwayMonths !== null
                                    ? `~${ev.snapshot.cashRunwayMonths} เดือน`
                                    : "—"
                                }
                              />
                              <Stat
                                label="ช่วงความเป็นไปได้"
                                value={`${formatCurrency(ev.snapshot.confidenceLow)} – ${formatCurrency(
                                  ev.snapshot.confidenceHigh
                                )}`}
                              />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <Link
                                href="/analytics"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                              >
                                <ExternalLink size={14} aria-hidden="true" />
                                ดูรายละเอียดการพยากรณ์
                              </Link>
                              <ActionButtons rec={rec} busy={busy === rec.id} onSet={setStatus} />
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-gray-400">
                              ข้อมูลประกอบถูกคำนวณใหม่แล้ว — ลองกด “คำนวณรายการใหม่” ด้านบน
                            </p>
                            <ActionButtons rec={rec} busy={busy === rec.id} onSet={setStatus} />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Disclosure — some items are forecast-derived */}
          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 text-center pt-1">
            <ShieldCheck size={13} className="text-emerald-500 shrink-0" aria-hidden="true" />
            รายการมาจากกฎอัตโนมัติบนข้อมูลที่คุณอัปโหลด · การพยากรณ์ใช้ค่าเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ AI ทำนาย
          </p>
        </>
      )}
    </div>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  );
}

function ActionButtons({
  rec,
  busy,
  onSet,
}: {
  rec: Recommendation;
  busy: boolean;
  onSet: (id: string, status: "APPLIED" | "DISMISSED" | "PENDING") => void;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {rec.status === "DISMISSED" ? (
        <button
          onClick={() => onSet(rec.id, "PENDING")}
          disabled={busy}
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-accent hover:text-accent transition-colors cursor-pointer disabled:opacity-50"
        >
          <RotateCcw size={13} aria-hidden="true" />
          นำกลับมา
        </button>
      ) : (
        <>
          <button
            onClick={() => onSet(rec.id, rec.status === "APPLIED" ? "PENDING" : "APPLIED")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={13} aria-hidden="true" />
            {rec.status === "APPLIED" ? "ตรวจแล้ว" : "ตรวจสอบแล้ว"}
          </button>
          <button
            onClick={() => onSet(rec.id, "DISMISSED")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Archive size={13} aria-hidden="true" />
            พักไว้
          </button>
        </>
      )}
    </div>
  );
}

function EmptyState({
  onRecompute,
  recomputing,
}: {
  onRecompute: () => void;
  recomputing: boolean;
}) {
  return (
    <div className="relative overflow-hidden surface-glass rounded-2xl px-6 py-12 text-center">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 mb-4">
        <CheckCircle2 size={28} aria-hidden="true" />
      </span>
      <p className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
        ยังไม่มีรายการที่ต้องตรวจสอบ
      </p>
      <p className="text-sm text-gray-400 max-w-md mx-auto mb-5">
        เมื่อระบบพบความผิดปกติของรายจ่ายหรือสัญญาณกระแสเงินสด จะสร้างรายการให้ตรวจสอบที่นี่
        — ลองอัปโหลดข้อมูลเพิ่มหรือคำนวณใหม่
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onRecompute}
          disabled={recomputing}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-gradient-accent text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
        >
          {recomputing ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw size={15} aria-hidden="true" />
          )}
          คำนวณรายการใหม่
        </button>
        <Link
          href="/analytics"
          className="text-sm font-medium text-accent hover:underline"
        >
          ไปหน้าวิเคราะห์เชิงลึก →
        </Link>
      </div>
    </div>
  );
}
