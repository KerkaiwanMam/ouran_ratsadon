"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Printer, AlertTriangle } from "lucide-react";

interface ReportData {
  file: {
    id: string;
    filename: string;
    periodStart: string | null;
    periodEnd: string | null;
    transactionCount: number | null;
  };
  user: { name: string; email: string; organization: string | null } | null;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    leakCount: number;
  };
  categories: { name: string; amount: number }[];
  leaks: {
    date: string;
    description: string;
    amount: number;
    leakFlag: string;
    leakSeverity: string | null;
    leakReason: string | null;
  }[];
}

function fmt(n: number) {
  return `฿${Math.abs(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

// Keys are Prisma LeakFlag enum values.
const FLAG_LABELS: Record<string, string> = {
  SPIKE: "ค่าใช้จ่ายพุ่งสูง",
  DUPLICATE: "รายการซ้ำน่าสงสัย",
  OUTLIER: "ค่าผิดปกติ",
  CREEP: "ค่าประจำพุ่ง",
};

export default function ReportPrintPage() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/business/report/${id}/export/pdf`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.message ?? "เกิดข้อผิดพลาด");
        else setData(d);
      })
      .catch(() => setError("ไม่สามารถโหลดข้อมูลได้"));
  }, [id]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-gray-600">{error}</p>
        {error.includes("Pro") && (
          <a href="/upgrade" className="text-[#7F77DD] hover:underline text-sm">
            อัปเกรดเป็น Pro
          </a>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        <Loader2 size={28} className="animate-spin mr-2" />
        กำลังเตรียมรายงาน...
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>

      {/* Print button — hidden in print */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-[#7F77DD] text-white text-sm font-medium rounded-lg hover:bg-[#534AB7] shadow-lg"
        >
          <Printer size={14} />
          พิมพ์ / บันทึกเป็น PDF
        </button>
      </div>

      {/* Report */}
      <div className="max-w-3xl mx-auto p-8 print:p-0">
        {/* Header */}
        <div className="border-b-2 border-[#7F77DD] pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#7F77DD]">อุรัณ รัษฎร</h1>
              <p className="text-xs text-gray-400 mt-0.5">Business Intelligence Platform</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>สร้างเมื่อ: {fmtDate(new Date().toISOString())}</p>
              {data.user && (
                <>
                  <p>{data.user.name}</p>
                  {data.user.organization && <p>{data.user.organization}</p>}
                </>
              )}
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-lg font-bold text-gray-800">รายงานการเงินธุรกิจ</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              ไฟล์: {data.file.filename} •{" "}
              {fmtDate(data.file.periodStart)} ถึง {fmtDate(data.file.periodEnd)}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "รายรับรวม", value: fmt(data.summary.totalIncome), color: "text-emerald-600" },
            { label: "รายจ่ายรวม", value: fmt(data.summary.totalExpense), color: "text-red-500" },
            { label: "กระแสเงินสด", value: fmt(data.summary.netCashFlow), color: data.summary.netCashFlow >= 0 ? "text-emerald-600" : "text-red-500" },
            { label: "รายการผิดปกติ", value: String(data.summary.leakCount), color: data.summary.leakCount > 0 ? "text-amber-500" : "text-gray-600" },
          ].map((c) => (
            <div key={c.label} className="border border-gray-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">{c.label}</p>
              <p className={`font-bold text-sm ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Category breakdown */}
        <div className="mb-6">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">การแจกแจงรายจ่ายตามหมวดหมู่</h3>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">หมวดหมู่</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">จำนวนเงิน</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">สัดส่วน</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((c, i) => (
                <tr key={c.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-3 py-2 text-gray-700">{c.name}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(c.amount)}</td>
                  <td className="px-3 py-2 text-right text-gray-400 text-xs">
                    {data.summary.totalExpense > 0
                      ? `${((c.amount / data.summary.totalExpense) * 100).toFixed(1)}%`
                      : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leak summary */}
        {data.leaks.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-400" />
              รายการที่ต้องตรวจสอบ ({data.leaks.length} รายการ)
            </h3>
            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">วันที่</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">รายการ</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">ประเภท</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {data.leaks.map((l, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{l.date}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-xs">
                      <p className="truncate">{l.description}</p>
                      {l.leakReason && (
                        <p className="text-gray-400 text-xs mt-0.5 truncate">{l.leakReason}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                        l.leakSeverity === "CRITICAL"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {FLAG_LABELS[l.leakFlag] ?? l.leakFlag}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          รายงานนี้สร้างโดยอุรัณ รัษฎร • ข้อมูลเป็นความลับ • สร้างเมื่อ {new Date().toLocaleString("th-TH")}
        </div>
      </div>
    </>
  );
}
