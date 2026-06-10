"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { FileText, Download, Printer, Loader2 } from "lucide-react";

export default function ReportExportPage() {
  const { id } = useParams() as { id: string };
  const [loadingCsv, setLoadingCsv] = useState(false);

  async function exportCsv() {
    setLoadingCsv(true);
    try {
      const res = await fetch(`/api/business/report/${id}/export/csv`);
      if (!res.ok) {
        const d = await res.json();
        alert(d.message ?? "ไม่สามารถส่งออกข้อมูลได้");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoadingCsv(false);
    }
  }

  function openPrint() {
    window.open(`/report/${id}/print`, "_blank");
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ส่งออกรายงาน</h1>
        <p className="text-sm text-gray-500 mt-1">รายงาน #{id}</p>
      </div>

      {/* CSV */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-start gap-4">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
          <Download size={20} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 dark:text-gray-200">CSV</p>
          <p className="text-xs text-gray-500 mt-0.5">
            ดาวน์โหลดรายการธุรกรรมทั้งหมดในรูปแบบ Spreadsheet
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={loadingCsv}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 shrink-0"
        >
          {loadingCsv ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          ดาวน์โหลด
        </button>
      </div>

      {/* PDF */}
      <div className="border border-[#7F77DD]/30 dark:border-[#7F77DD]/20 bg-[#7F77DD]/5 dark:bg-[#7F77DD]/10 rounded-xl p-5 flex items-start gap-4">
        <div className="p-2 bg-[#7F77DD]/20 rounded-lg shrink-0">
          <Printer size={20} className="text-[#7F77DD]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-gray-800 dark:text-gray-200">PDF</p>
            <span className="text-xs px-1.5 py-0.5 bg-[#7F77DD] text-white rounded-full font-medium">Pro</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            รายงานแบบพิมพ์ได้ พร้อมสรุป หมวดหมู่ และรายการผิดปกติ — เปิดในแท็บใหม่แล้วใช้ Ctrl+P เพื่อบันทึก
          </p>
        </div>
        <button
          onClick={openPrint}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#7F77DD] text-white rounded-lg hover:bg-[#534AB7] transition-colors shrink-0"
        >
          <Printer size={14} />
          เปิดรายงาน
        </button>
      </div>

      <p className="text-xs text-gray-400">
        หมายเหตุ: PDF export ใช้ฟีเจอร์พิมพ์ของเบราว์เซอร์ — เลือก "Save as PDF" ใน print dialog
      </p>
    </div>
  );
}
