"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, TriangleAlert, X, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/utils/format";

// In-app threshold alert banner (Frontend Track · PRO). Surfaces categories
// whose spend is at/over their budget for the current month, at the very top of
// the dashboard — "เตือนก่อนปัญหาบานปลาย". Layer 3 (narrative warning) + Layer 2
// (every flagged category links to its raw transactions to verify the number).
//
// Threshold: warn at ≥ 85% of budget, escalate to "over" at > 100%.

interface Category {
  name: string;
  amount: number;
  budgetAmount: number | null;
  percentage: number;
}

interface Props {
  categories: Category[];
  period: string | null;
  isPro: boolean;
}

export default function BudgetAlertBanner({ categories, period, isPro }: Props) {
  const [dismissed, setDismissed] = useState(false);

  // PRO feature — free users don't see budget threshold alerts.
  if (!isPro || dismissed) return null;

  const flagged = categories
    .filter((c) => c.budgetAmount != null && c.budgetAmount > 0)
    .map((c) => ({ ...c, budget: c.budgetAmount as number, ratio: c.amount / (c.budgetAmount as number) }))
    .filter((c) => c.ratio >= 0.85)
    .sort((a, b) => b.ratio - a.ratio);

  if (flagged.length === 0) return null;

  const overCount = flagged.filter((c) => c.ratio > 1).length;
  const danger = overCount > 0;

  const Icon = danger ? TriangleAlert : AlertTriangle;
  const headline = danger
    ? `มี ${overCount} หมวดใช้จ่ายเกินงบประมาณเดือนนี้แล้ว`
    : `${flagged.length} หมวดใกล้ถึงงบประมาณที่ตั้งไว้`;

  const tone = danger
    ? {
        wrap: "border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-900/15",
        bar: "bg-red-500",
        icon: "text-red-500",
        title: "text-red-700 dark:text-red-300",
      }
    : {
        wrap: "border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-900/15",
        bar: "bg-amber-500",
        icon: "text-amber-500",
        title: "text-amber-700 dark:text-amber-300",
      };

  return (
    <div
      role="alert"
      className={`relative overflow-hidden rounded-2xl border ${tone.wrap} px-5 py-4 mb-6`}
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${tone.bar}`} aria-hidden="true" />
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${tone.icon}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className={`text-sm font-semibold ${tone.title}`}>{headline}</p>
            <button
              onClick={() => setDismissed(true)}
              aria-label="ปิดการแจ้งเตือน"
              className="shrink-0 -mt-0.5 -mr-1 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>

          <ul className="mt-2.5 space-y-2">
            {flagged.slice(0, 4).map((c) => {
              const pct = Math.round(c.ratio * 100);
              const isOver = c.ratio > 1;
              return (
                <li key={c.name}>
                  <Link
                    href={`/transactions?category=${encodeURIComponent(c.name)}${
                      period ? `&month=${period}` : ""
                    }`}
                    className="group flex items-center gap-3"
                  >
                    <span className="w-24 shrink-0 text-sm text-gray-700 dark:text-gray-200 font-medium truncate group-hover:text-[#7F77DD] group-hover:underline">
                      {c.name}
                    </span>
                    <span className="flex-1 h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <span
                        className={`block h-full rounded-full ${isOver ? "bg-red-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </span>
                    <span
                      className={`shrink-0 text-xs font-semibold tabular-nums ${
                        isOver ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {pct}%
                    </span>
                    <span className="shrink-0 text-xs text-gray-400 tabular-nums hidden sm:inline">
                      {formatCurrency(c.amount)} / {formatCurrency(c.budget)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {flagged.length > 4 && (
            <p className="mt-2 text-xs text-gray-400">และอีก {flagged.length - 4} หมวด</p>
          )}

          <Link
            href="/analytics"
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            ดูรายละเอียดงบประมาณทั้งหมด
            <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
