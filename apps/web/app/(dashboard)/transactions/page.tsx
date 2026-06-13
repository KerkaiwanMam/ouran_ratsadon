"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  Loader2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  TrendingUp,
  TrendingDown,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/format";
import StatusBadge from "@/components/shared/StatusBadge";
import KeywordCloud from "@/components/shared/KeywordCloud";
import type { KeywordCount } from "@/lib/keywords";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TransactionItem {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  transactionType: "INCOME" | "EXPENSE";
  autoCategorized: boolean;
  userOverrode: boolean;
  leakFlag: "NONE" | "SPIKE" | "DUPLICATE" | "OUTLIER" | "CREEP";
  leakSeverity: "CRITICAL" | "WARNING" | "INFO" | null;
  leakReason: string | null;
  file: { id: string; filename: string } | null;
}

interface TransactionsResponse {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  categories: string[];
  keywords: KeywordCount[];
  summary: { totalIncome: number; totalExpense: number; net: number };
  items: TransactionItem[];
}

const LEAK_LABELS: Record<string, string> = {
  SPIKE: "ค่าใช้จ่ายพุ่งสูง",
  DUPLICATE: "รายการซ้ำ/เปลี่ยนแปลง",
  OUTLIER: "ค่าผิดปกติ",
  CREEP: "ค่าใช้จ่ายไต่ระดับ",
};

const STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "NONE", label: "ปกติ" },
  { value: "SPIKE", label: LEAK_LABELS.SPIKE },
  { value: "DUPLICATE", label: LEAK_LABELS.DUPLICATE },
  { value: "OUTLIER", label: LEAK_LABELS.OUTLIER },
  { value: "CREEP", label: LEAK_LABELS.CREEP },
];

// Built-in categorizer patterns (apps/web/lib/file-processor.ts) — included so
// the dropdown always offers the full standard set even before any transaction
// in this user's data has used a given category yet.
const FALLBACK_CATEGORIES = [
  "บุคลากร", "สถานที่", "ต้นทุนสินค้า", "สาธารณูปโภค", "การตลาด",
  "ค่าเดินทาง", "ซ่อมบำรุง", "ประกัน", "การเงิน", "อุปกรณ์", "ยังไม่จัดหมวดหมู่",
];

function statusOf(tx: TransactionItem): "ปกติ" | "ผิดปกติ" | "ตรวจสอบ" {
  if (tx.leakSeverity === "CRITICAL") return "ผิดปกติ";
  if (tx.leakFlag !== "NONE") return "ตรวจสอบ";
  return "ปกติ";
}

function CategoryCell({
  tx,
  categoryOptions,
  onSave,
}: {
  tx: TransactionItem;
  categoryOptions: string[];
  onSave: (id: string, category: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next === tx.category) return;
    setSaving(true);
    try {
      await onSave(tx.id, next);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={tx.category}
        onChange={handleChange}
        disabled={saving}
        className="text-sm bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded-md px-1.5 py-1 -mx-1.5 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/30 focus:border-transparent disabled:opacity-50 max-w-[160px]"
      >
        {categoryOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {saving && <Loader2 size={12} className="animate-spin text-gray-400 shrink-0" />}
      {!saving && justSaved && <Check size={12} className="text-emerald-500 shrink-0" />}
      {!saving && !justSaved && tx.userOverrode && (
        <span
          title="แก้ไขโดยผู้ใช้ — ระบบจะจดจำหมวดหมู่นี้สำหรับรายการคล้ายกันในอนาคต"
          className="w-1.5 h-1.5 rounded-full bg-[#7F77DD]/60 shrink-0"
        />
      )}
    </div>
  );
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const category = searchParams.get("category") ?? "";
  const leakFlag = searchParams.get("leakFlag") ?? "";
  const month = searchParams.get("month") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = searchParams.get("page") ?? "1";

  const [searchInput, setSearchInput] = useState(search);
  const [viewMode, setViewMode] = useState<"list" | "keyword">("list");

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  // Debounce search input → URL param
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ search: searchInput || null, page: null });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (leakFlag) query.set("leakFlag", leakFlag);
  if (month) query.set("month", month);
  if (search) query.set("search", search);
  if (page) query.set("page", page);

  const { data, isLoading, error, mutate } = useSWR<TransactionsResponse>(
    `/api/business/transactions?${query.toString()}`,
    fetcher
  );

  async function handleCategorySave(id: string, newCategory: string) {
    const res = await fetch(`/api/business/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory }),
    });
    if (res.ok) {
      await mutate();
    }
  }

  // KeywordBudget view — clicking a keyword filters the list to that term
  // and switches back to the table so the user sees the results.
  function handleKeywordSelect(keyword: string) {
    setSearchInput(keyword);
    updateParams({ search: keyword, page: null });
    setViewMode("list");
  }

  const categoryOptions = Array.from(
    new Set([...(data?.categories ?? []), ...FALLBACK_CATEGORIES])
  ).sort();

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === leakFlag)?.label ?? leakFlag;

  const activeFilters: { key: string; label: string }[] = [];
  if (category) activeFilters.push({ key: "category", label: `หมวดหมู่: ${category}` });
  if (leakFlag) activeFilters.push({ key: "leakFlag", label: `สถานะ: ${statusLabel}` });
  if (month) activeFilters.push({ key: "month", label: `เดือน: ${month}` });
  if (search) activeFilters.push({ key: "search", label: `ค้นหา: "${search}"` });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-gradient-accent">รายการ</span>{" "}
          <span className="text-gray-900 dark:text-gray-100">ธุรกรรม</span>
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          ดูรายการดิบทั้งหมด — แก้ไขหมวดหมู่ได้โดยตรง ระบบจะจดจำสำหรับรายการคล้ายกันในอนาคต
        </p>
      </div>

      {/* search + filters + active filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหารายการ..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/30"
          />
        </div>

        <select
          value={category}
          onChange={(e) => updateParams({ category: e.target.value || null, page: null })}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/30 cursor-pointer"
        >
          <option value="">ทุกหมวดหมู่</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={leakFlag}
          onChange={(e) => updateParams({ leakFlag: e.target.value || null, page: null })}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/30 cursor-pointer"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {activeFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => updateParams({ [f.key]: null, page: null })}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-[#7F77DD]/10 text-[#534AB7] dark:text-[#bdb8f5] font-medium hover:bg-[#7F77DD]/20 transition-colors"
          >
            {f.label}
            <X size={12} />
          </button>
        ))}

        {activeFilters.length > 0 && (
          <button
            onClick={() => router.push(pathname)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        )}
      </div>

      {/* results toolbar — view toggle + filtered totals, outside the table
          and grouped with the filters above */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200 cursor-pointer ${
              viewMode === "list"
                ? "bg-white dark:bg-gray-900 text-[#7F77DD] shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            รายการ
          </button>
          <button
            onClick={() => setViewMode("keyword")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200 cursor-pointer ${
              viewMode === "keyword"
                ? "bg-white dark:bg-gray-900 text-[#7F77DD] shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            KeywordBudget
          </button>
        </div>

        {data && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
              <TrendingUp size={14} />
              <span>รับ {formatCurrency(data.summary.totalIncome)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
              <TrendingDown size={14} />
              <span>จ่าย {formatCurrency(Math.abs(data.summary.totalExpense))}</span>
            </div>
            <div
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg ${
                data.summary.net >= 0
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}
            >
              <Scale size={14} />
              <span>
                สุทธิ {data.summary.net >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(data.summary.net))}
              </span>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {data.total.toLocaleString()} รายการ
            </span>
          </div>
        )}
      </div>

      <div className="relative surface-glass rounded-2xl overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            กำลังโหลดข้อมูล...
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-16 text-gray-400 text-sm">
            ไม่สามารถโหลดรายการได้ กรุณาลองใหม่อีกครั้ง
          </div>
        )}

        {data && !isLoading && viewMode === "keyword" && (
          <KeywordCloud
            keywords={data.keywords}
            onSelect={handleKeywordSelect}
            hint="คีย์เวิร์ดที่พบบ่อยในรายการของผลลัพธ์ปัจจุบัน — คลิกเพื่อกรองดูรายการที่เกี่ยวข้อง"
          />
        )}

        {data && !isLoading && viewMode === "list" && data.items.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            ไม่พบรายการที่ตรงกับเงื่อนไข
          </div>
        )}

        {data && viewMode === "list" && data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 text-left border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300 leading-snug">วันที่</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300 leading-snug">รายการ</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300 leading-snug">หมวดหมู่</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300 leading-snug text-right">จำนวนเงิน</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300 leading-snug">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.items.map((tx) => (
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
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap leading-snug align-middle">{formatDate(tx.date)}</td>
                      <td className="px-4 py-2.5 align-middle">
                        <p className="text-gray-900 dark:text-gray-100 leading-snug">{tx.description}</p>
                        {tx.leakReason && (
                          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{tx.leakReason}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <CategoryCell tx={tx} categoryOptions={categoryOptions} onSave={handleCategorySave} />
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono font-medium whitespace-nowrap align-middle ${
                          tx.transactionType === "INCOME"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          {tx.transactionType === "INCOME" ? (
                            <ArrowDownLeft size={12} />
                          ) : (
                            <ArrowUpRight size={12} />
                          )}
                          {tx.transactionType === "INCOME" ? "+" : "-"}
                          {formatCurrency(Math.abs(tx.amount))}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <StatusBadge status={statusOf(tx)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm">
              <span className="text-gray-400 text-xs">
                หน้า {data.page} จาก {data.pages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateParams({ page: String(data.page - 1) })}
                  disabled={data.page <= 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft size={14} />
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => updateParams({ page: String(data.page + 1) })}
                  disabled={data.page >= data.pages}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  ถัดไป
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 size={28} className="animate-spin mr-2" />
          กำลังโหลด...
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}
