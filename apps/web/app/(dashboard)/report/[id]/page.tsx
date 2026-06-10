import { MOCK_SUMMARY, MOCK_TRANSACTIONS } from "@/lib/mock-data";
import { formatCurrency, formatPercent } from "@/utils/format";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import BudgetBarChart from "@/components/charts/BudgetBarChart";
import SpendingPieChart from "@/components/charts/SpendingPieChart";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  const { totalIncome, totalExpense, netCashFlow, categories } = MOCK_SUMMARY;

  const barData = categories.map((c) => ({
    name: c.name,
    budget: c.amount,
    spent: Math.round(c.amount * 0.85),
  }));

  const pieData = categories.map((c) => ({
    name: c.name,
    value: c.amount,
  }));

  const anomalyCount = MOCK_TRANSACTIONS.filter((t) => t.leakFlag !== "NONE").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">รายงานไฟล์</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{id}</p>
        </div>
        <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
          Demo Data
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="รายรับรวม"    value={formatCurrency(totalIncome)}  trend="up" />
        <StatCard label="รายจ่ายรวม"   value={formatCurrency(totalExpense)} trend="up" />
        <StatCard label="กระแสเงินสด"  value={formatCurrency(netCashFlow)}  trend="up" />
        <StatCard label="รายการผิดปกติ" value={anomalyCount} unit="รายการ" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <BudgetBarChart data={barData} />
        <SpendingPieChart data={pieData} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium">รายการทั้งหมด</h3>
          <span className="text-xs text-gray-400">{MOCK_TRANSACTIONS.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">รายการ</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">หมวดหมู่</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 text-right">จำนวนเงิน</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {MOCK_TRANSACTIONS.map((tx) => (
                <tr
                  key={tx.id}
                  className={
                    tx.leakFlag === "SPIKE" || tx.leakFlag === "OUTLIER"
                      ? "bg-red-50 dark:bg-red-900/10"
                      : tx.leakFlag !== "NONE"
                      ? "bg-amber-50 dark:bg-amber-900/10"
                      : ""
                  }
                >
                  <td className="px-4 py-3">
                    <p>{tx.description}</p>
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
                        tx.leakFlag === "SPIKE" || tx.leakFlag === "OUTLIER"
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
