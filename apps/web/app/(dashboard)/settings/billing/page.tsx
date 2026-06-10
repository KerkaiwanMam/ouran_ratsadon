"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, AlertTriangle, CheckCircle2, Clock, Ban } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Subscription {
  plan: string;
  status: string;
  billingCycle: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
}

const PLAN_LABELS: Record<string, string> = {
  FREE: "ฟรี",
  PRO: "Pro (฿299/เดือน)",
  TEAM: "Team (฿799/เดือน)",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  TRIAL: "text-[#7F77DD] bg-[#7F77DD]/10",
  CANCELLED: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
  PAST_DUE: "text-red-600 bg-red-50 dark:bg-red-900/20",
  EXPIRED: "text-gray-500 bg-gray-100 dark:bg-gray-800",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "ใช้งานอยู่",
  TRIAL: "ทดลองใช้",
  CANCELLED: "ยกเลิกแล้ว",
  PAST_DUE: "ชำระล่าช้า",
  EXPIRED: "หมดอายุ",
};

function trialDaysLeft(trialEndsAt: string) {
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function SettingsBillingPage() {
  const [cancelling, setCancelling] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);

  const { data: sub, isLoading: subLoading } = useSWR<Subscription>("/api/subscription", fetcher);
  const { data: histData, isLoading: histLoading } = useSWR<{ records: PaymentRecord[] }>(
    "/api/subscription/history",
    fetcher
  );

  const records = histData?.records ?? [];

  async function cancelSubscription() {
    if (!confirm("ต้องการยกเลิกสมาชิกหรือไม่? คุณยังใช้งานได้จนสิ้นรอบบิลปัจจุบัน")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const d = await res.json();
      if (!res.ok) { alert(d.message ?? "เกิดข้อผิดพลาด"); return; }
      setCancelDone(true);
      globalMutate("/api/subscription");
    } finally {
      setCancelling(false);
    }
  }

  function fmtDate(s: string | null) {
    if (!s) return "-";
    return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  }

  function fmtAmount(amount: number, currency: string) {
    const divisor = currency.toLowerCase() === "thb" ? 100 : 100;
    return `${(amount / divisor).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ${currency.toUpperCase()}`;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">การเรียกเก็บเงิน</h1>

      {/* Current plan */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <CreditCard size={16} />
          แผนปัจจุบัน
        </h2>

        {subLoading ? (
          <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ) : sub ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {PLAN_LABELS[sub.plan] ?? sub.plan}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[sub.status] ?? ""}`}>
                {STATUS_LABELS[sub.status] ?? sub.status}
              </span>
            </div>

            {sub.status === "TRIAL" && sub.trialEndsAt && (
              <div className="flex items-center gap-2 text-sm text-[#7F77DD] bg-[#7F77DD]/10 rounded-xl px-3 py-2">
                <Clock size={14} />
                ทดลองใช้อีก{" "}
                <strong>{trialDaysLeft(sub.trialEndsAt)} วัน</strong>
                {" "}(สิ้นสุด {fmtDate(sub.trialEndsAt)})
              </div>
            )}

            {sub.cancelAtPeriodEnd && sub.currentPeriodEnd && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
                <AlertTriangle size={14} />
                ยกเลิกแล้ว — ยังใช้งานได้ถึง {fmtDate(sub.currentPeriodEnd)}
              </div>
            )}

            {!sub.cancelAtPeriodEnd && sub.currentPeriodEnd && sub.status === "ACTIVE" && (
              <p className="text-sm text-gray-500">
                รอบบิลถัดไป: <span className="font-medium">{fmtDate(sub.currentPeriodEnd)}</span>
              </p>
            )}

            <div className="flex gap-3 pt-2">
              {sub.plan === "FREE" || sub.status === "TRIAL" ? (
                <Link
                  href="/upgrade"
                  className="px-4 py-2 text-sm font-semibold bg-[#7F77DD] text-white rounded-xl hover:bg-[#534AB7] transition-colors"
                >
                  {sub.status === "TRIAL" ? "ซื้อแผน Pro" : "อัปเกรด"}
                </Link>
              ) : null}

              {sub.plan !== "FREE" && !sub.cancelAtPeriodEnd && !cancelDone && (
                <button
                  onClick={cancelSubscription}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  {cancelling ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                  ยกเลิกสมาชิก
                </button>
              )}

              {cancelDone && (
                <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 size={14} />
                  ยกเลิกเรียบร้อยแล้ว
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">ไม่พบข้อมูลสมาชิก</p>
        )}
      </div>

      {/* Payment history */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">ประวัติการชำระเงิน</h2>

        {histLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีประวัติการชำระเงิน</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2">วันที่</th>
                <th className="pb-2">รายการ</th>
                <th className="pb-2 text-right">จำนวน</th>
                <th className="pb-2 text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 text-gray-500 whitespace-nowrap">
                    {fmtDate(r.paidAt ?? r.createdAt)}
                  </td>
                  <td className="py-2.5 text-gray-700 dark:text-gray-300">
                    {r.description ?? "Subscription"}
                  </td>
                  <td className="py-2.5 text-right font-mono text-gray-700 dark:text-gray-300">
                    {fmtAmount(r.amount, r.currency)}
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.status === "paid"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : r.status === "failed"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {r.status === "paid" ? "ชำระแล้ว" : r.status === "failed" ? "ล้มเหลว" : r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info box */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>• การชำระเงินผ่าน Stripe (Payment Service Provider ที่ได้รับรองมาตรฐาน PCI-DSS)</p>
        <p>• อุรัณ รัษฎร ไม่เก็บข้อมูลบัตรเครดิตโดยตรง</p>
        <p>• หากมีปัญหาการชำระเงิน <Link href="/contact" className="text-[#7F77DD] hover:underline">ติดต่อเรา</Link></p>
      </div>
    </div>
  );
}
