import { MOCK_BUDGET } from "@/lib/mock-data";
import { formatCurrency } from "@/utils/format";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import BudgetBarChart from "@/components/charts/BudgetBarChart";
import SpendingPieChart from "@/components/charts/SpendingPieChart";

export default function DashboardPage() {
  const { summary, items, metadata } = MOCK_BUDGET;

  const barData = summary.categories.map((c) => ({
    name: c.name,
    budget: c.budget,
    spent: c.spent,
  }));

  const pieData = summary.categories.map((c) => ({
    name: c.name,
    value: c.spent,
  }));

  const anomalyCount = items.filter((i) => i.anomalyFlag !== "none").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {metadata.organization} — ปีงบประมาณ {metadata.fiscalYear}
          </p>
        </div>
        <span className="text-xs bg-purple-100 text-[#7F77DD] px-3 py-1 rounded-full font-medium">
          Mock Data
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="งบประมาณทั้งหมด"
          value={formatCurrency(summary.totalBudget)}
        />
        <StatCard
          label="เบิกจ่ายแล้ว"
          value={formatCurrency(summary.totalSpent)}
          trend="up"
        />
        <StatCard
          label="คงเหลือ"
          value={formatCurrency(summary.totalRemaining)}
          trend="down"
        />
        <StatCard
          label="รายการผิดปกติ"
          value={anomalyCount}
          unit="รายการ"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <BudgetBarChart data={barData} />
        <SpendingPieChart data={pieData} />
      </div>

      {/* Budget Items Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium">รายการงบประมาณ</h3>
          <span className="text-xs text-gray-400">{items.length} รายการ</span>
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
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.anomalyFlag === "critical"
                      ? "bg-red-50 dark:bg-red-900/10"
                      : item.anomalyFlag === "warning"
                      ? "bg-amber-50 dark:bg-amber-900/10"
                      : ""
                  }
                >
                  <td className="px-4 py-3">
                    <p>{item.description}</p>
                    {item.anomalyReason && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.anomalyReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={
                        item.anomalyFlag === "critical"
                          ? "ผิดปกติ"
                          : item.anomalyFlag === "warning"
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
