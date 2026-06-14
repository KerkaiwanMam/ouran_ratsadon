import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/utils/format";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import BudgetBarChart from "@/components/charts/BudgetBarChart";
import SpendingPieChart from "@/components/charts/SpendingPieChart";

interface PageProps {
  params: Promise<{ id: string }>;
}

const thaiDate = (d: Date | null) =>
  d ? d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : null;

// File-scoped report for one uploaded file. Reads the file's real transactions
// directly (file grain — a legitimate per-file view, distinct from the monthly
// One-View-One-Truth headline that /dashboard and /analytics read from the
// governed MonthlyFinancialSummary).
export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/report/${id}`);

  const file = await prisma.file.findFirst({
    where: { id, userId: user.sub },
    include: { transactions: { orderBy: { date: "desc" }, take: 500 } },
  });
  if (!file) notFound();

  // ── Aggregate the file's real transactions ───────────────────────────────
  // Transaction.amount is Prisma.Decimal (@db.Decimal(15,2)) — coerce for arithmetic.
  const txns = file.transactions;
  const totalIncome = txns
    .filter((t) => t.transactionType === "INCOME")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = txns
    .filter((t) => t.transactionType === "EXPENSE")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const netCashFlow = totalIncome - totalExpense;
  const anomalyCount = txns.filter((t) => t.leakFlag !== "NONE").length;

  const byCategory: Record<string, number> = {};
  for (const t of txns) {
    if (t.transactionType !== "EXPENSE") continue;
    byCategory[t.category] = (byCategory[t.category] ?? 0) + Math.abs(Number(t.amount));
  }
  const categories = Object.entries(byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Budget vs actual — only for categories the user has actually set a budget
  // for (standing or for this file's period). No budget set → not charted,
  // rather than inventing a target.
  const budgets = await prisma.budget.findMany({
    where: { userId: user.sub },
    select: { category: true, amount: true, month: true },
  });
  const budgetMap = new Map<string, number>();
  for (const b of budgets.filter((b) => b.month === null)) budgetMap.set(b.category, Number(b.amount));
  for (const b of budgets.filter((b) => b.month !== null)) budgetMap.set(b.category, Number(b.amount));

  const barData = categories
    .filter((c) => budgetMap.has(c.name))
    .map((c) => ({ name: c.name, budget: budgetMap.get(c.name)!, spent: Math.round(c.amount) }));

  const pieData = categories.map((c) => ({ name: c.name, value: c.amount }));

  const period =
    thaiDate(file.periodStart) && thaiDate(file.periodEnd)
      ? `${thaiDate(file.periodStart)} – ${thaiDate(file.periodEnd)}`
      : null;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{file.filename}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            รายงานไฟล์{period ? ` · ${period}` : ""} · {txns.length} รายการ
          </p>
        </div>
        <span className="shrink-0 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-3 py-1 rounded-full font-medium">
          ข้อมูลจริง
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="รายรับรวม" value={formatCurrency(totalIncome)} />
        <StatCard label="รายจ่ายรวม" value={formatCurrency(totalExpense)} />
        <StatCard label="กระแสเงินสด" value={formatCurrency(netCashFlow)} />
        <StatCard label="รายการผิดปกติ" value={anomalyCount} unit="รายการ" />
      </div>

      {txns.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-10 text-center text-sm text-gray-400">
          ไฟล์นี้ยังไม่มีรายการธุรกรรม
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {barData.length > 0 ? (
              <BudgetBarChart data={barData} />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border flex flex-col">
                <h3 className="text-sm font-medium mb-4">งบประมาณตามหมวดหมู่</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center min-h-[260px]">
                  <p className="text-sm text-gray-400 mb-2">ยังไม่ได้ตั้งงบประมาณสำหรับหมวดเหล่านี้</p>
                  <a href="/dashboard" className="text-sm text-[#7F77DD] hover:underline">
                    ตั้งงบประมาณเพื่อเปรียบเทียบ →
                  </a>
                </div>
              </div>
            )}
            <SpendingPieChart data={pieData} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-medium">รายการทั้งหมด</h3>
              <span className="text-xs text-gray-400">{txns.length} รายการ</span>
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
                  {txns.map((tx) => (
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
                        {formatCurrency(Math.abs(Number(tx.amount)))}
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
        </>
      )}
    </div>
  );
}
