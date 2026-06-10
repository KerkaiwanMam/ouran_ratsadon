"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const plan = params.get("plan") ?? "Pro";
  const isMock = params.get("mock") === "true";

  return (
    <div className="max-w-md mx-auto text-center py-20 px-4">
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-[#7F77DD]/10 rounded-full">
          <CheckCircle2 size={48} className="text-[#7F77DD]" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        ยินดีด้วย! คุณเริ่มทดลองใช้ {plan} แล้ว
      </h1>
      <p className="text-gray-500 mb-2">
        คุณได้รับ <strong className="text-[#7F77DD]">14 วันทดลองใช้ฟรี</strong> — ไม่เก็บค่าใช้จ่ายจนกว่าทดลองจะสิ้นสุด
      </p>
      {isMock && (
        <p className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg mb-4">
          โหมดทดสอบ (Stripe ยังไม่ได้ตั้งค่า) — แผนถูกเปิดใช้งานโดยตรง
        </p>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-6 text-left space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
          <Sparkles size={14} className="text-[#7F77DD]" />
          ฟีเจอร์ที่ใช้ได้เลยทันที:
        </p>
        {[
          "อัปโหลดไฟล์ไม่จำกัด",
          "Leak Detection ครบ 4 กฎ",
          "Cash Flow Forecast + What-If",
          "Alerts (Email)",
          "PDF Export",
          "Budget vs Actual Comparison",
        ].map((f) => (
          <div key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            {f}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/upload"
          className="px-6 py-2.5 bg-[#7F77DD] text-white font-semibold rounded-xl hover:bg-[#534AB7] transition-colors text-sm"
        >
          อัปโหลดไฟล์แรก
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
        >
          ไปยัง Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
