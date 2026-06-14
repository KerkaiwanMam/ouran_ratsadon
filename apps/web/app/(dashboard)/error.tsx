"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";

// Route-level error boundary for the whole Business Layer (dashboard group).
// Catches render/data errors in any nested page so a single failing fetch shows
// a friendly retry instead of a blank crash. `reset()` re-renders the segment.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for logging/monitoring (Sentry slot — Pro-Max DevOps track).
    console.error("[dashboard] route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 mb-4">
        <AlertTriangle size={28} aria-hidden="true" />
      </span>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
        เกิดข้อผิดพลาดในการแสดงหน้านี้
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        ระบบโหลดข้อมูลส่วนนี้ไม่สำเร็จ ลองโหลดใหม่อีกครั้ง — หากยังเกิดซ้ำ กรุณาลองใหม่ภายหลัง
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-accent text-white hover:opacity-90 transition-opacity cursor-pointer"
        >
          <RotateCcw size={15} aria-hidden="true" />
          ลองใหม่
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <LayoutDashboard size={15} aria-hidden="true" />
          กลับแดชบอร์ด
        </Link>
      </div>
    </div>
  );
}
