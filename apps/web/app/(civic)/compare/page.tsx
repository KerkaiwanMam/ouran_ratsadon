"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, TrendingUp, AlertTriangle, FolderOpen } from "lucide-react";

interface SavedSearch {
  id: string;
  label: string;
  filters: string;
  resultCount: number | null;
}

interface SearchResult {
  total: number;
  totalAmount: number;
  redFlagCount: number;
  avgChangePct: number;
  items: { id: string; name: string; amount: number; changePct: number; flags: unknown[] }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildSearchUrl(filters: Record<string, unknown>): string {
  const p = new URLSearchParams();
  if (filters.year) p.set("year", String(filters.year));
  if (filters.q) p.set("q", String(filters.q));
  if (filters.sort) p.set("sort", String(filters.sort));
  p.set("page", "1");
  p.set("limit", "100");
  if (Array.isArray(filters.ministries)) filters.ministries.forEach((m: string) => p.append("ministries[]", m));
  if (Array.isArray(filters.budgetTypes)) filters.budgetTypes.forEach((t: string) => p.append("budgetTypes[]", t));
  if (Array.isArray(filters.status)) filters.status.forEach((s: string) => p.append("status[]", s));
  if (filters.minAmount) p.set("minAmount", String(filters.minAmount));
  if (filters.maxAmount) p.set("maxAmount", String(filters.maxAmount));
  return `/api/civic/search?${p.toString()}`;
}

function CompareColumn({ search }: { search: SavedSearch }) {
  const filters = JSON.parse(search.filters) as Record<string, unknown>;
  const { data, isLoading } = useSWR<SearchResult>(buildSearchUrl(filters), fetcher);

  return (
    <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[#7F77DD]/10 border-b border-[#7F77DD]/20">
        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{search.label}</h3>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {filters.q ? `"${filters.q}"` : "ทั้งหมด"}
          {filters.year ? ` · พ.ศ. ${filters.year}` : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {/* Stats */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400">โครงการ</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{data.total.toLocaleString()}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400">งบรวม</p>
              <p className="text-xl font-bold text-[#7F77DD]">
                ฿{(data.totalAmount / 1e9).toFixed(1)}B
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
            <div className="px-4 py-3 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-red-400" />
              <div>
                <p className="text-xs text-gray-400">ธงแดง</p>
                <p className="font-bold text-gray-800 dark:text-gray-100">{data.redFlagCount}</p>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-amber-400" />
              <div>
                <p className="text-xs text-gray-400">เพิ่มเฉลี่ย</p>
                <p className="font-bold text-gray-800 dark:text-gray-100">
                  {data.avgChangePct > 0 ? "+" : ""}{data.avgChangePct.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Top 5 projects */}
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-gray-500 mb-2">โครงการวงเงินสูงสุด</p>
            <div className="space-y-1.5">
              {data.items.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/project/${item.id}?year=${filters.year ?? "2568"}`}
                    className="text-xs text-gray-700 dark:text-gray-300 hover:text-[#7F77DD] truncate flex-1"
                  >
                    {item.name}
                  </Link>
                  <span className="text-xs font-mono text-gray-500 shrink-0">
                    ฿{(item.amount / 1e9).toFixed(1)}B
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Link back to search */}
          <div className="px-4 py-2.5">
            <Link
              href={`/search?${new URLSearchParams(filters as Record<string, string>).toString()}`}
              className="text-xs text-[#7F77DD] hover:underline"
            >
              ดูผลการค้นหาเต็ม →
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-gray-400">ไม่สามารถโหลดข้อมูลได้</div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const { data, isLoading } = useSWR<{ searches: SavedSearch[] }>(
    "/api/civic/saved-searches",
    fetcher
  );
  const [selected, setSelected] = useState<string[]>([]);

  const searches = data?.searches ?? [];
  const comparing = searches.filter((s) => selected.includes(s.id));

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/search" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">เปรียบเทียบการค้นหา</h1>
          <p className="text-sm text-gray-500 mt-0.5">เลือก 2-3 การค้นหาเพื่อดูข้างกัน</p>
        </div>
      </div>

      {/* Selection */}
      {isLoading ? (
        <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
      ) : searches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FolderOpen size={36} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">ยังไม่มีการค้นหาที่บันทึกไว้</p>
          <Link href="/search" className="text-sm text-[#7F77DD] hover:underline mt-1 block">
            ไปค้นหาและบันทึก →
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-3">เลือกได้สูงสุด 3 รายการ</p>
          <div className="flex flex-wrap gap-2">
            {searches.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSelect(s.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selected.includes(s.id)
                    ? "bg-[#7F77DD] text-white border-[#7F77DD]"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#7F77DD]"
                }`}
              >
                {s.label}
                {s.resultCount !== null && (
                  <span className="ml-1 opacity-70 text-xs">({s.resultCount})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-side comparison */}
      {comparing.length >= 2 && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {comparing.map((s) => (
            <CompareColumn key={s.id} search={s} />
          ))}
        </div>
      )}

      {selected.length === 1 && (
        <p className="text-center text-sm text-gray-400">
          เลือกอีก {2 - selected.length} รายการเพื่อเริ่มเปรียบเทียบ
        </p>
      )}
    </div>
  );
}
