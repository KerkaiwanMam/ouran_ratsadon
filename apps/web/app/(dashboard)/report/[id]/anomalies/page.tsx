"use client";

import { useState } from "react";
import useSWR from "swr";
import { AlertTriangle, TrendingUp, Copy, Activity, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

interface LeakItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  transactionType: string;
  category: string;
  leakFlag: string;
  leakSeverity: string | null;
  leakReason: string | null;
  file: { id: string; filename: string } | null;
}

interface LeaksResponse {
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  flagCounts: Record<string, number>;
  items: LeakItem[];
}

// Keys are Prisma LeakFlag enum values. Duplicate-payment and changed-amount
// re-import share the DUPLICATE flag — leakReason text distinguishes them.
const FLAG_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  SPIKE: {
    label: "ค่าใช้จ่ายพุ่งสูง",
    icon: <TrendingUp size={14} />,
    color: "amber",
  },
  DUPLICATE: {
    label: "รายการซ้ำน่าสงสัย",
    icon: <Copy size={14} />,
    color: "red",
  },
  OUTLIER: {
    label: "ค่าผิดปกติ",
    icon: <Activity size={14} />,
    color: "orange",
  },
  CREEP: {
    label: "ค่าประจำพุ่ง",
    icon: <TrendingUp size={14} />,
    color: "purple",
  },
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  WARNING: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ReportAnomaliesPage({ params: _params }: Props) {
  const [flag, setFlag] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: String(page) });
  if (flag) query.set("flag", flag);

  const { data, isLoading, error } = useSWR<LeaksResponse>(
    `/api/business/leaks?${query.toString()}`,
    fetcher
  );

  if (error || (data && "error" in data)) {
    const isPlanError = (data as { error?: string })?.error === "PLAN_REQUIRED";
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="font-semibold text-gray-700 dark:text-gray-200">
          {isPlanError ? "ฟีเจอร์ Pro เท่านั้น" : "ไม่สามารถโหลดข้อมูลได้"}
        </p>
        {isPlanError && (
          <a
            href="/upgrade"
            className="mt-2 px-4 py-2 bg-[#7F77DD] text-white text-sm font-medium rounded-lg hover:bg-[#534AB7] transition-colors"
          >
            อัปเกรดเป็น Pro
          </a>
        )}
      </div>
    );
  }

  const flagCounts = data?.flagCounts ?? {};
  const allFlags = Object.keys(FLAG_META);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          ความผิดปกติที่ตรวจพบ
        </h1>
        {data && (
          <p className="text-sm text-gray-500 mt-1">
            พบรายการผิดปกติทั้งหมด{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {data.total.toLocaleString()}
            </span>{" "}
            รายการ
          </p>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setFlag(null); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            flag === null
              ? "bg-[#7F77DD] text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          ทั้งหมด{" "}
          {data && (
            <span className="ml-1 opacity-80">
              ({Object.values(flagCounts).reduce((a, b) => a + b, 0)})
            </span>
          )}
        </button>
        {allFlags.map((f) => {
          const meta = FLAG_META[f];
          const count = flagCounts[f] ?? 0;
          if (!count && flag !== f) return null;
          return (
            <button
              key={f}
              onClick={() => { setFlag(f); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                flag === f
                  ? "bg-[#7F77DD] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {meta.icon}
              {meta.label}
              <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Activity size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">ไม่พบรายการผิดปกติ{flag ? `สำหรับประเภทที่เลือก` : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => {
            const meta = FLAG_META[item.leakFlag];
            const severityStyle = SEVERITY_STYLES[item.leakSeverity ?? "WARNING"] ?? SEVERITY_STYLES.WARNING;
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${severityStyle}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
                        {meta?.icon}
                        {meta?.label ?? item.leakFlag}
                      </span>
                      <span className="text-xs opacity-70">•</span>
                      <span className="text-xs opacity-70">{item.category}</span>
                      <span className="text-xs opacity-70">•</span>
                      <span className="text-xs opacity-70">{item.date}</span>
                    </div>
                    <p className="font-medium text-sm truncate">{item.description}</p>
                    {item.leakReason && (
                      <p className="text-xs mt-1 opacity-80 leading-relaxed">{item.leakReason}</p>
                    )}
                    {item.file && (
                      <p className="text-xs mt-1 opacity-60">ไฟล์: {item.file.filename}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">
                      {item.transactionType === "INCOME" ? "+" : "-"}฿
                      {Math.abs(item.amount).toLocaleString()}
                    </p>
                    <span className="text-xs font-medium uppercase opacity-70">
                      {item.leakSeverity}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            หน้า {page} / {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
