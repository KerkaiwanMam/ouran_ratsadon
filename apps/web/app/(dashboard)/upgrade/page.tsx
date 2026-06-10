"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Loader2, Zap, Users } from "lucide-react";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Subscription {
  plan: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

const PRO_FEATURES = [
  "อัปโหลดไฟล์ไม่จำกัด",
  "Leak Detection ครบ 4 กฎ",
  "Cash Flow Forecast + What-If",
  "Alerts (Email)",
  "PDF Export",
  "Budget vs Actual Comparison",
  "Priority Support",
];

const TEAM_EXTRA = [
  "ทุกอย่างใน Pro",
  "5 ที่นั่ง / workspace",
  "Shared dashboards",
  "Comments & annotations",
  "Role-based access",
  "Alerts (Email + LINE)",
];

export default function UpgradePage() {
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: sub } = useSWR<Subscription>("/api/subscription", fetcher);
  const currentPlan = sub?.plan ?? "FREE";
  const isOnTrial = sub?.status === "TRIAL";

  async function startCheckout(plan: "PRO" | "TEAM") {
    setError(null);
    setLoading(plan);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "เกิดข้อผิดพลาด");
        return;
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(null);
    }
  }

  const proPrice = billing === "yearly" ? "฿2,990" : "฿299";
  const teamPrice = billing === "yearly" ? "฿7,990" : "฿799";
  const pricePer = billing === "yearly" ? "/ปี" : "/เดือน";
  const yearlySavings = billing === "yearly" ? "(ประหยัด ฿598)" : null;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">อัปเกรดแผน</h1>
        {isOnTrial && sub?.trialEndsAt && (
          <p className="text-sm mt-1">
            <span className="text-amber-500 font-medium">กำลังใช้ทดลอง Pro</span>
            {" "}—{" "}
            <span className="text-gray-500">
              สิ้นสุด {new Date(sub.trialEndsAt).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </p>
        )}
        {!isOnTrial && currentPlan !== "FREE" && (
          <p className="text-sm text-gray-500 mt-1">
            แผนปัจจุบัน: <span className="font-medium text-[#7F77DD]">{currentPlan}</span>
          </p>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">รายเดือน</span>
        <button
          onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
          className={`relative w-12 h-6 rounded-full transition-colors ${billing === "yearly" ? "bg-[#7F77DD]" : "bg-gray-200 dark:bg-gray-700"}`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billing === "yearly" ? "translate-x-6" : ""}`} />
        </button>
        <span className="text-sm text-gray-500">
          รายปี{" "}
          <span className="text-emerald-500 font-medium text-xs bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
            ประหยัด 16%
          </span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Pro */}
        <div className={`border-2 rounded-2xl p-6 flex flex-col ${currentPlan === "PRO" && !isOnTrial ? "border-[#7F77DD] bg-[#7F77DD]/5" : "border-[#7F77DD]"} relative`}>
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#7F77DD] text-white text-xs font-bold rounded-full">
            แนะนำ
          </span>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-[#7F77DD]" />
            <span className="font-bold text-gray-900 dark:text-gray-100">SME Pro</span>
          </div>
          <div className="mb-4">
            <span className="text-3xl font-black text-gray-900 dark:text-gray-100">{proPrice}</span>
            <span className="text-sm text-gray-400 ml-1">{pricePer}</span>
            {yearlySavings && <p className="text-xs text-emerald-500 mt-0.5">{yearlySavings}</p>}
          </div>
          <ul className="space-y-2 flex-1 mb-5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Check size={13} className="text-emerald-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => startCheckout("PRO")}
            disabled={!!loading || (currentPlan === "PRO" && !isOnTrial)}
            className="w-full py-2.5 bg-[#7F77DD] text-white font-semibold rounded-xl hover:bg-[#534AB7] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading === "PRO" && <Loader2 size={14} className="animate-spin" />}
            {currentPlan === "PRO" && !isOnTrial ? "แผนปัจจุบัน" : "เริ่ม 14 วันฟรี"}
          </button>
        </div>

        {/* Team */}
        <div className={`border-2 rounded-2xl p-6 flex flex-col ${currentPlan === "TEAM" ? "border-[#7F77DD] bg-[#7F77DD]/5" : "border-gray-200 dark:border-gray-700"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-gray-500" />
            <span className="font-bold text-gray-900 dark:text-gray-100">SME Team</span>
          </div>
          <div className="mb-4">
            <span className="text-3xl font-black text-gray-900 dark:text-gray-100">{teamPrice}</span>
            <span className="text-sm text-gray-400 ml-1">{pricePer}</span>
          </div>
          <ul className="space-y-2 flex-1 mb-5">
            {TEAM_EXTRA.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Check size={13} className="text-emerald-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => startCheckout("TEAM")}
            disabled={!!loading || currentPlan === "TEAM"}
            className="w-full py-2.5 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading === "TEAM" && <Loader2 size={14} className="animate-spin" />}
            {currentPlan === "TEAM" ? "แผนปัจจุบัน" : "เริ่ม 14 วันฟรี"}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        ทดลองฟรี 14 วัน ไม่ต้องใส่บัตรเครดิตล่วงหน้า (เมื่อตั้งค่า Stripe แล้ว) •
        ยกเลิกได้ทุกเมื่อ • ข้อมูลของคุณยังเข้าถึงได้จนสิ้นรอบบิล
      </p>
    </div>
  );
}
