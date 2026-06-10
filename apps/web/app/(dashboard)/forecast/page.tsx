"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer, Area, ComposedChart,
} from "recharts";
import { Info, TrendingDown, Wallet } from "lucide-react";
import type { ForecastResult, ForecastPoint, MonthlyPoint } from "@/lib/forecaster";
import { whatIf } from "@/lib/forecaster";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatMonth(mo: string) {
  const [, m] = mo.split("-");
  const names = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return names[parseInt(m, 10) - 1] ?? mo;
}

function formatB(n: number) {
  if (n >= 1e6) return `฿${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `฿${(n / 1e3).toFixed(0)}K`;
  return `฿${n.toFixed(0)}`;
}

function buildChartData(historical: MonthlyPoint[], forecast: ForecastPoint[]) {
  return [
    ...historical.map((p) => ({
      month: formatMonth(p.month),
      income: p.income,
      expense: p.expense,
      net: p.net,
      isForecast: false,
    })),
    ...forecast.map((p) => ({
      month: formatMonth(p.month),
      income: p.forecastIncome,
      expense: p.forecastExpense,
      net: p.forecastNet,
      upperIncome: p.upperIncome,
      lowerIncome: p.lowerIncome,
      isForecast: true,
    })),
  ];
}

export default function ForecastPage() {
  const [horizon, setHorizon] = useState(6);
  const [currentCash, setCurrentCash] = useState(0);
  const [revenueChange, setRevenueChange] = useState(0);
  const [isPlanGated, setIsPlanGated] = useState(false);

  const { data: base } = useSWR<ForecastResult>(
    `/api/business/forecast?horizon=${horizon}&currentCash=${currentCash}`,
    (url: string) =>
      fetch(url).then((r) => {
        if (r.status === 403) setIsPlanGated(true);
        return r.json();
      })
  );

  if (isPlanGated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <TrendingDown size={40} className="text-amber-400" />
        <p className="font-semibold text-gray-700 dark:text-gray-200">ฟีเจอร์ Pro เท่านั้น</p>
        <a
          href="/upgrade"
          className="px-4 py-2 bg-[#7F77DD] text-white text-sm font-medium rounded-lg hover:bg-[#534AB7] transition-colors"
        >
          อัปเกรดเป็น Pro
        </a>
      </div>
    );
  }

  const adjusted =
    base && base.sufficiency !== "insufficient" && revenueChange !== 0
      ? whatIf(base, revenueChange, currentCash)
      : null;

  const activeForecast = adjusted?.adjustedForecast ?? base?.forecast ?? [];
  const chartData = base
    ? buildChartData(base.historical, activeForecast)
    : [];

  const runway = adjusted?.newRunway ?? base?.runway ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">พยากรณ์กระแสเงินสด</h1>
        {base?.disclaimer && (
          <div className="flex items-start gap-2 mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">{base.disclaimer}</p>
          </div>
        )}
      </div>

      {base?.sufficiency === "insufficient" ? (
        <div className="text-center py-16 text-gray-400">
          <TrendingDown size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">{base.disclaimer}</p>
          <p className="text-xs mt-1">อัปโหลดข้อมูลอีก {3 - base.monthsOfData} เดือนเพื่อเริ่มพยากรณ์</p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <label className="text-xs font-medium text-gray-500 mb-2 block">ช่วงพยากรณ์</label>
              <div className="flex gap-2">
                {[3, 6, 12].map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
                      horizon === h
                        ? "bg-[#7F77DD] text-white border-[#7F77DD]"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-[#7F77DD]"
                    }`}
                  >
                    {h} เดือน
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <label className="text-xs font-medium text-gray-500 mb-2 block">
                <Wallet size={12} className="inline mr-1" />
                เงินสดปัจจุบัน (฿)
              </label>
              <input
                type="number"
                value={currentCash || ""}
                onChange={(e) => setCurrentCash(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
              />
            </div>

            {/* What-if slider */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <label className="text-xs font-medium text-gray-500 mb-2 flex items-center justify-between">
                <span>What-if: รายได้เปลี่ยน</span>
                <span className={`font-bold ${revenueChange < 0 ? "text-red-500" : revenueChange > 0 ? "text-green-500" : "text-gray-400"}`}>
                  {revenueChange > 0 ? "+" : ""}{revenueChange}%
                </span>
              </label>
              <input
                type="range"
                min={-50}
                max={50}
                step={5}
                value={revenueChange}
                onChange={(e) => setRevenueChange(parseInt(e.target.value, 10))}
                className="w-full accent-[#7F77DD]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>-50%</span>
                <span>0</span>
                <span>+50%</span>
              </div>
            </div>
          </div>

          {/* Runway card */}
          {runway !== null && (
            <div className={`rounded-xl border p-4 flex items-center gap-3 ${
              runway <= 3
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                : runway <= 6
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
            }`}>
              <Wallet size={24} className={runway <= 3 ? "text-red-500" : runway <= 6 ? "text-amber-500" : "text-emerald-500"} />
              <div>
                <p className="font-semibold text-sm">
                  Cash Runway ≈ <span className="text-lg">{runway}</span> เดือน
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {runway <= 3
                    ? "⚠️ เงินสดจะหมดเร็ว — พิจารณาลดรายจ่ายหรือหาแหล่งเงินทุนเพิ่ม"
                    : runway <= 6
                    ? "ควรวางแผนรายรับเพิ่มเติมในช่วง 6 เดือนข้างหน้า"
                    : "กระแสเงินสดอยู่ในระดับที่ดี"}
                </p>
              </div>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
                กระแสเงินสด — ประวัติ + พยากรณ์
                {revenueChange !== 0 && (
                  <span className="ml-2 text-xs font-normal text-[#7F77DD]">
                    (What-if: รายได้ {revenueChange > 0 ? "+" : ""}{revenueChange}%)
                  </span>
                )}
              </h2>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatB(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatB(v)} />
                  <Legend />
                  {/* Confidence band for income */}
                  <Area
                    type="monotone"
                    dataKey="upperIncome"
                    fill="#7F77DD"
                    stroke="none"
                    fillOpacity={0.08}
                    name="ช่วงความเชื่อมั่น"
                    legendType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerIncome"
                    fill="#ffffff"
                    stroke="none"
                    fillOpacity={1}
                    legendType="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#34D399"
                    strokeWidth={2}
                    dot={false}
                    name="รายรับ"
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#F87171"
                    strokeWidth={2}
                    dot={false}
                    name="รายจ่าย"
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#7F77DD"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={false}
                    name="กระแสสุทธิ"
                  />
                  <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
