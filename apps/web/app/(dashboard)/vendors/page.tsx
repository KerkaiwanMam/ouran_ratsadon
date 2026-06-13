"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Loader2, Lock, Search, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface VendorTrendPoint {
  month: string;
  amount: number;
}

interface Vendor {
  key: string;
  name: string;
  category: string;
  totalSpent: number;
  txCount: number;
  trend: VendorTrendPoint[];
  trendPct: number | null;
}

interface VendorsResponse {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  months: string[];
  vendors: Vendor[];
}

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function monthLabel(m: string) {
  const [y, mm] = m.split("-");
  const idx = parseInt(mm, 10) - 1;
  return `${THAI_MONTHS_SHORT[idx] ?? mm} ${y?.slice(2) ?? ""}`;
}

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">—</span>;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        up ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
      }`}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function Sparkline({ trend }: { trend: VendorTrendPoint[] }) {
  return (
    <div className="w-28 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend}>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(label) => monthLabel(String(label))}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              fontSize: 11,
              padding: "4px 8px",
            }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#7F77DD"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function VendorsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isPlanGated, setIsPlanGated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = new URLSearchParams();
  if (search) query.set("search", search);
  query.set("page", String(page));

  const { data, isLoading } = useSWR<VendorsResponse>(
    `/api/business/vendors?${query.toString()}`,
    (url: string) =>
      fetch(url).then((r) => {
        if (r.status === 403) setIsPlanGated(true);
        return r.json();
      })
  );

  if (isPlanGated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <Lock size={40} className="text-amber-400" />
        <div>
          <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
            โปรไฟล์ผู้ให้บริการ (Vendors) — ฟีเจอร์ Pro เท่านั้น
          </p>
          <p className="text-sm text-gray-400">
            ดูยอดใช้จ่ายรวมและแนวโน้มรายเดือนของผู้ให้บริการ/คู่ค้าแต่ละราย
          </p>
        </div>
        <Link
          href="/upgrade"
          className="px-4 py-2 bg-[#7F77DD] text-white text-sm font-medium rounded-lg hover:bg-[#534AB7] transition-colors"
        >
          อัปเกรดเป็น Pro
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-gradient-accent">ผู้ให้บริการ</span>{" "}
          <span className="text-gray-900 dark:text-gray-100">และคู่ค้า</span>
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          ยอดใช้จ่ายรวมและแนวโน้ม 6 เดือนล่าสุด แยกตามผู้ให้บริการ
        </p>
      </div>

      <div className="mb-4">
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาผู้ให้บริการ..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/30"
          />
        </div>
      </div>

      <div className="relative surface-glass rounded-2xl overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold">ผู้ให้บริการทั้งหมด</h3>
          <span className="text-xs text-gray-400">
            {data ? `${data.total.toLocaleString()} ราย` : ""}
          </span>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            กำลังโหลดข้อมูล...
          </div>
        )}

        {data && !isLoading && data.vendors.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            {search ? "ไม่พบผู้ให้บริการที่ตรงกับการค้นหา" : "ยังไม่มีข้อมูลรายจ่าย — อัปโหลดไฟล์เพื่อเริ่มดูผู้ให้บริการ"}
          </div>
        )}

        {data && data.vendors.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">ผู้ให้บริการ</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">หมวดหมู่</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 text-right">ยอดรวม</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 text-center">แนวโน้ม 6 เดือน</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 text-right">เทียบเดือนก่อน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.vendors.map((v) => (
                    <tr key={v.key}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/transactions?search=${encodeURIComponent(v.name)}`}
                          className="text-gray-900 dark:text-gray-100 hover:text-[#7F77DD] hover:underline font-medium"
                        >
                          {v.name}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">{v.txCount} รายการ</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{v.category}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(v.totalSpent)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Sparkline trend={v.trend} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TrendBadge pct={v.trendPct} />
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft size={14} />
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
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
