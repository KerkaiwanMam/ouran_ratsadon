"use client";

import useSWR from "swr";
import Link from "next/link";
import { formatCurrency } from "@/utils/format";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Sparkles,
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400 py-6 text-center">{children}</p>;
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
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
  const latest = months[months.length - 1];
  const insights = diagnostics.data?.insights ?? [];
  const snapshot = forecastQ.data?.snapshot ?? null;
  const recs = recommendations.data?.recommendations ?? [];

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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          วิเคราะห์เชิงลึก (Analytics)
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          ภาพรวม 4 มิติ — เกิดอะไรขึ้น ทำไมถึงเกิด แนวโน้มต่อไป และควรทำอะไรต่อ
        </p>
      </div>

      {/* Tier 1 — Descriptive */}
      <Card title="1. เกิดอะไรขึ้น (Descriptive) — สรุปรายเดือน">
        {months.length === 0 ? (
          <EmptyNote>
            ยังไม่มีข้อมูลเพียงพอ —{" "}
            <Link href="/upload" className="text-[#7F77DD] hover:underline">
              อัปโหลดไฟล์การเงินของคุณ
            </Link>{" "}
            เพื่อเริ่มวิเคราะห์
          </EmptyNote>
        ) : (
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
                  <tr key={m.month} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-200">{m.month}</td>
                    <td className="py-2 pr-4 text-right text-emerald-600">{formatCurrency(m.totalIncome)}</td>
                    <td className="py-2 pr-4 text-right text-red-500">{formatCurrency(m.totalExpense)}</td>
                    <td
                      className={`py-2 text-right font-medium ${
                        m.net >= 0 ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {formatCurrency(m.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {latest && (
              <p className="text-xs text-gray-400 mt-3">
                เดือนล่าสุด ({latest.month}) มีหมวดค่าใช้จ่ายสูงสุด:{" "}
                {latest.byCategory[0]?.category ?? "—"} (
                {formatCurrency(latest.byCategory[0]?.totalExpense ?? 0)})
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Tier 2 — Diagnostic */}
      <Card title="2. ทำไมถึงเกิดขึ้น (Diagnostic) — ข้อสังเกตจากเดือนล่าสุด">
        {insights.length === 0 ? (
          <EmptyNote>ยังไม่พบความผิดปกติที่น่าสังเกตในเดือนล่าสุด</EmptyNote>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight) => {
              const Icon = insightTypeIcon[insight.insightType] ?? AlertTriangle;
              return (
                <li key={insight.id} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-[#7F77DD]">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-0.5">
                      {insightTypeLabel[insight.insightType] ?? insight.insightType} · {insight.month}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{insight.summary}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Tier 3 — Predictive */}
      <Card title="3. แนวโน้มต่อไป (Predictive) — พยากรณ์เดือนถัดไป">
        {!snapshot ? (
          <div className="text-center py-4">
            <EmptyNote>ยังไม่มีข้อมูลพยากรณ์ — ต้องมีประวัติอย่างน้อย 3 เดือน</EmptyNote>
            <button
              onClick={handleRunForecast}
              className="text-sm font-medium text-white bg-[#7F77DD] hover:bg-[#6b63c9] px-4 py-2 rounded-lg transition-colors"
            >
              คำนวณการพยากรณ์
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-400">เดือนที่พยากรณ์</p>
                <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {snapshot.forecastMonth}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">กระแสเงินสดสุทธิที่คาด</p>
                <p
                  className={`text-base font-semibold ${
                    snapshot.predictedNet >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {formatCurrency(snapshot.predictedNet)}
                </p>
                <p className="text-xs text-gray-400">
                  ช่วงความเป็นไปได้: {formatCurrency(snapshot.confidenceLow)} ถึง{" "}
                  {formatCurrency(snapshot.confidenceHigh)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">เงินสดจะอยู่ได้อีก</p>
                <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {snapshot.cashRunwayMonths !== null ? `~${snapshot.cashRunwayMonths} เดือน` : "—"}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
              วิธีคิด: {snapshot.inputWindow?.disclaimer ?? "ใช้ค่าเฉลี่ยถ่วงน้ำหนัก (WMA) — ไม่ใช่ AI"}
            </p>
            <button
              onClick={handleRunForecast}
              className="text-xs font-medium text-[#7F77DD] hover:underline"
            >
              คำนวณใหม่จากข้อมูลล่าสุด
            </button>
          </div>
        )}
      </Card>

      {/* Tier 4 — Prescriptive */}
      <Card title="4. ควรทำอะไรต่อ (Prescriptive) — คำแนะนำที่แนะนำ">
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
                  <Lightbulb size={16} className="text-[#7F77DD] mt-0.5 shrink-0" aria-hidden="true" />
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
                    className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleRecAction(rec.id, "DISMISSED")}
                    title="ไม่สนใจ"
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <XCircle size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-gray-400 text-center pt-2">
        การพยากรณ์ทั้งหมดใช้ค่าเฉลี่ยถ่วงน้ำหนัก (Weighted Moving Average) และดัชนีฤดูกาล — ไม่ใช่ AI หรือ Machine
        Learning ใช้เพื่อประกอบการตัดสินใจเท่านั้น
      </p>
    </div>
  );
}
