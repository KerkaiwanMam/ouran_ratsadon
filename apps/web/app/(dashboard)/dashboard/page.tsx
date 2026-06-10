"use client";

import useSWR from "swr";
import { formatCurrency } from "@/utils/format";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import SpendingPieChart from "@/components/charts/SpendingPieChart";
import BudgetVsActual from "@/components/business/BudgetVsActual";
import Link from "next/link";
import { Upload, Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

interface DashboardResponse {
  hasData: boolean;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    period: string | null;
    categories: DashboardCategory[];
  };
  transactions: DashboardTransaction[];
}

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
  const { data, isLoading, error, mutate } = useSWR<DashboardResponse>(
    "/api/business/dashboard",
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={28} className="animate-spin mr-2" />
        กำลังโหลดข้อมูล...
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

  const { totalIncome, totalExpense, netCashFlow, categories, period } = data.summary;
  const transactions = data.transactions;

  const pieData = categories.map((c) => ({
    name: c.name,
    value: c.amount,
  }));

  const anomalyCount = transactions.filter((t) => t.leakFlag !== "NONE").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatPeriod(period)} 2568 (ข้อมูลจริงของคุณ)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/upload"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#7F77DD] text-white rounded-lg hover:bg-[#534AB7] transition-colors"
          >
            <Upload size={14} />
            อัปโหลดไฟล์เพิ่ม
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="รายรับรวม" value={formatCurrency(totalIncome)} trend="up" />
        <StatCard label="รายจ่ายรวม" value={formatCurrency(totalExpense)} trend="up" />
        <StatCard
          label="กระแสเงินสด"
          value={formatCurrency(netCashFlow)}
          trend={netCashFlow >= 0 ? "up" : "down"}
        />
        <StatCard label="รายการผิดปกติ" value={anomalyCount} unit="รายการ" />
      </div>

      {/* Charts */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <BudgetVsActual
            categories={categories}
            period={period}
            onBudgetSaved={() => mutate()}
          />
          <SpendingPieChart data={pieData} />
        </div>
      )}

      {/* Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium">รายการล่าสุด</h3>
          <span className="text-xs text-gray-400">{transactions.length} รายการ</span>
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
                  className={
                    tx.leakSeverity === "CRITICAL"
                      ? "bg-red-50 dark:bg-red-900/10"
                      : tx.leakFlag !== "NONE"
                      ? "bg-amber-50 dark:bg-amber-900/10"
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
    </div>
  );
}
