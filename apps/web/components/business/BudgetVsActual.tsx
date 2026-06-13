"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, X, Check, Loader2 } from "lucide-react";

interface CategoryBudget {
  name: string;
  amount: number; // actual spend
  percentage: number;
  trendPct: number;
  isNew: boolean;
  budgetAmount: number | null;
}

interface Props {
  categories: CategoryBudget[];
  period: string | null;
  onBudgetSaved?: () => void;
}

function BudgetBar({
  actual,
  budget,
}: {
  actual: number;
  budget: number | null;
}) {
  if (!budget) {
    // No budget set — show plain bar
    return (
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-[#7F77DD] h-2 rounded-full transition-all"
          style={{ width: "100%" }}
        />
      </div>
    );
  }
  const pct = Math.min((actual / budget) * 100, 120);
  const overBudget = actual > budget;
  return (
    <div className="relative w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full transition-all ${
          overBudget ? "bg-red-500" : pct > 80 ? "bg-amber-400" : "bg-emerald-500"
        }`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
      {/* Budget marker */}
      <div className="absolute top-0 right-0 h-full w-0.5 bg-gray-400 dark:bg-gray-500 rounded" />
    </div>
  );
}

function BudgetEditRow({
  category,
  currentBudget,
  period,
  onSaved,
}: {
  category: string;
  currentBudget: number | null;
  period: string | null;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(currentBudget?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    const amount = parseFloat(value.replace(/,/g, ""));
    if (isNaN(amount) || amount < 0) return;
    setSaving(true);
    await fetch("/api/business/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, amount, month: period }),
    });
    setSaving(false);
    setDone(true);
    setTimeout(() => { setDone(false); onSaved(); }, 800);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">฿</span>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-28 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
        placeholder="0"
        min="0"
      />
      <button
        onClick={save}
        disabled={saving || done}
        className="p-1 rounded-lg bg-[#7F77DD] text-white disabled:opacity-50"
      >
        {saving ? (
          <Loader2 size={12} className="animate-spin" />
        ) : done ? (
          <Check size={12} />
        ) : (
          <Check size={12} />
        )}
      </button>
    </div>
  );
}

export default function BudgetVsActual({ categories, period, onBudgetSaved }: Props) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const overBudgetCount = categories.filter(
    (c) => c.budgetAmount !== null && c.amount > c.budgetAmount
  ).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">งบประมาณ vs ค่าใช้จ่ายจริง</h3>
          {overBudgetCount > 0 && (
            <p className="text-xs text-red-500 mt-0.5">
              เกินงบ {overBudgetCount} หมวดหมู่
            </p>
          )}
        </div>
        <span className="text-xs text-gray-400">กดดินสอเพื่อตั้งงบ</span>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const isEditing = editingCategory === cat.name;
          const overBudget = cat.budgetAmount !== null && cat.amount > cat.budgetAmount;
          return (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/transactions?category=${encodeURIComponent(cat.name)}`}
                    className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-[#7F77DD] hover:underline transition-colors"
                  >
                    {cat.name}
                  </Link>
                  {overBudget && (
                    <span className="text-xs text-red-500 font-medium">เกินงบ</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <>
                      <BudgetEditRow
                        category={cat.name}
                        currentBudget={cat.budgetAmount}
                        period={period}
                        onSaved={() => {
                          setEditingCategory(null);
                          onBudgetSaved?.();
                        }}
                      />
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-right">
                        <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                          ฿{cat.amount.toLocaleString()}
                        </span>
                        {cat.budgetAmount !== null && (
                          <span className="text-xs text-gray-400 ml-1">
                            / ฿{cat.budgetAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingCategory(cat.name)}
                        className="p-1 text-gray-300 hover:text-[#7F77DD] transition-colors"
                        title="ตั้งงบประมาณ"
                      >
                        <Pencil size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <BudgetBar actual={cat.amount} budget={cat.budgetAmount} />
              {cat.budgetAmount !== null && (
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs text-gray-400">
                    {cat.budgetAmount > 0
                      ? `${Math.round((cat.amount / cat.budgetAmount) * 100)}% ของงบ`
                      : ""}
                  </span>
                  {overBudget && (
                    <span className="text-xs text-red-500">
                      เกิน ฿{(cat.amount - cat.budgetAmount).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {categories.every((c) => c.budgetAmount === null) && (
        <p className="text-xs text-center text-gray-400 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          กดไอคอนดินสอหน้าหมวดหมู่เพื่อตั้งงบประมาณรายเดือน
        </p>
      )}
    </div>
  );
}
