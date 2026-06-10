"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Bell, BellOff, Check, Loader2, AlertTriangle, TrendingDown, Wallet, Copy, MessageSquare, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

interface Alert {
  id: string;
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
}

interface AlertsResponse {
  alerts: Alert[];
  unreadCount: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_META: Record<string, { icon: React.ReactNode; label: string }> = {
  LOW_RUNWAY: { icon: <Wallet size={14} />, label: "เงินสดต่ำ" },
  OVER_BUDGET: { icon: <TrendingDown size={14} />, label: "เกินงบ" },
  NEW_LEAK: { icon: <AlertTriangle size={14} />, label: "ความผิดปกติใหม่" },
  DUPLICATE_PAYMENT: { icon: <Copy size={14} />, label: "ชำระซ้ำ" },
  SUBSCRIPTION_EXPIRING: { icon: <Bell size={14} />, label: "แพ็กเกจใกล้หมดอายุ" },
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "border-l-red-500 bg-red-50 dark:bg-red-900/10",
  WARNING: "border-l-amber-400 bg-amber-50 dark:bg-amber-900/10",
  INFO: "border-l-blue-400 bg-blue-50 dark:bg-blue-900/10",
};

export default function SettingsNotificationsPage() {
  // ── LINE Notify token state ──────────────────────────────────────────────
  const [lineToken, setLineToken]       = useState<string | null>(null);
  const [tokenInput, setTokenInput]     = useState("");
  const [tokenSaving, setTokenSaving]   = useState(false);
  const [testSending, setTestSending]   = useState(false);
  const [feedback, setFeedback]         = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setLineToken(d.lineNotifyToken ?? null))
      .catch(() => {});
  }, []);

  function flash(ok: boolean, msg: string) {
    setFeedback({ ok, msg });
    setTimeout(() => setFeedback(null), 5000);
  }

  async function saveToken() {
    setTokenSaving(true);
    const res = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineNotifyToken: tokenInput.trim() || null }),
    });
    setTokenSaving(false);
    if (res.ok) { setLineToken(tokenInput.trim() || null); setTokenInput(""); flash(true, "บันทึก LINE Notify Token สำเร็จ"); }
    else { const j = await res.json(); flash(false, j.message ?? "เกิดข้อผิดพลาด"); }
  }

  async function removeToken() {
    setTokenSaving(true);
    await fetch("/api/settings/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineNotifyToken: null }),
    });
    setTokenSaving(false);
    setLineToken(null);
    flash(true, "ยกเลิกการเชื่อมต่อ LINE Notify แล้ว");
  }

  async function sendTest() {
    setTestSending(true);
    const res = await fetch("/api/settings/notifications/test-line", { method: "POST" });
    const j = await res.json();
    setTestSending(false);
    flash(res.ok, j.message ?? (res.ok ? "ส่งข้อความทดสอบสำเร็จ" : "ส่งไม่สำเร็จ"));
  }

  // ── Alerts feed state ────────────────────────────────────────────────────
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const { data, isLoading } = useSWR<AlertsResponse>("/api/business/alerts", fetcher);

  const alerts = data?.alerts ?? [];
  const unread = alerts.filter((a) => !a.read);

  async function dismiss(id: string) {
    setDismissing(id);
    await fetch("/api/business/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], action: "dismiss" }),
    });
    globalMutate("/api/business/alerts");
    setDismissing(null);
  }

  async function markAllRead() {
    if (unread.length === 0) return;
    setMarkingAll(true);
    await fetch("/api/business/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unread.map((a) => a.id), action: "read" }),
    });
    globalMutate("/api/business/alerts");
    setMarkingAll(false);
  }

  async function markRead(id: string) {
    await fetch("/api/business/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], action: "read" }),
    });
    globalMutate("/api/business/alerts");
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">

      {/* LINE Notify section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#06C755] flex items-center justify-center">
            <MessageSquare size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">LINE Notify</p>
            <p className="text-xs text-gray-500">รับการแจ้งเตือนตรงใน LINE</p>
          </div>
        </div>

        {feedback && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-3 ${feedback.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {feedback.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {feedback.msg}
          </div>
        )}

        {lineToken ? (
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <CheckCircle2 size={14} className="text-green-600 shrink-0" />
              <span className="text-xs text-green-700 dark:text-green-400 font-medium">เชื่อมต่อแล้ว</span>
            </div>
            <button onClick={sendTest} disabled={testSending} className="px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5">
              {testSending ? <Loader2 size={12} className="animate-spin" /> : null}ทดสอบ
            </button>
            <button onClick={removeToken} disabled={tokenSaving} className="px-3 py-2 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">
              ยกเลิก
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              รับ token ได้ที่{" "}
              <a href="https://notify-bot.line.me/my/" target="_blank" rel="noopener noreferrer" className="text-[#7F77DD] hover:underline inline-flex items-center gap-0.5">
                notify-bot.line.me/my <ExternalLink size={11} />
              </a>
              {" "}→ Generate token → วาง token ด้านล่าง
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="LINE Notify Token"
                className="flex-1 px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F77DD] font-mono"
                onKeyDown={(e) => e.key === "Enter" && tokenInput && saveToken()}
              />
              <button onClick={saveToken} disabled={tokenSaving || !tokenInput.trim()} className="px-4 py-2 text-xs bg-[#7F77DD] text-white rounded-lg hover:bg-[#6B63CC] disabled:opacity-50 flex items-center gap-1.5">
                {tokenSaving && <Loader2 size={12} className="animate-spin" />}บันทึก
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alerts feed */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">การแจ้งเตือน</h1>
          {data && data.unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              ยังไม่อ่าน{" "}
              <span className="font-semibold text-[#7F77DD]">{data.unreadCount}</span> รายการ
            </p>
          )}
        </div>
        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {markingAll ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Trigger info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm">
        <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">การแจ้งเตือนจะถูกสร้างเมื่อ:</p>
        <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5 list-disc list-inside">
          <li>Cash runway เหลือน้อยกว่า 3 เดือน</li>
          <li>ค่าใช้จ่ายหมวดใดเกินงบที่ตั้งไว้</li>
          <li>พบรายการผิดปกติหลังอัปโหลดไฟล์</li>
        </ul>
        <p className="text-xs text-blue-500 dark:text-blue-500 mt-2">
          การแจ้งเตือนทางอีเมลจะเปิดใช้งานในเวอร์ชันถัดไป
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BellOff size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">ยังไม่มีการแจ้งเตือน</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const meta = TYPE_META[alert.type];
            return (
              <div
                key={alert.id}
                onClick={() => !alert.read && markRead(alert.id)}
                className={`rounded-xl border-l-4 p-4 cursor-pointer transition-opacity ${SEVERITY_STYLES[alert.severity] ?? ""} ${alert.read ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {meta?.icon && (
                        <span className="text-gray-600 dark:text-gray-300">{meta.icon}</span>
                      )}
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {meta?.label ?? alert.type}
                      </span>
                      {!alert.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7F77DD] shrink-0" />
                      )}
                    </div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                      {alert.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(alert.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismiss(alert.id); }}
                    disabled={dismissing === alert.id}
                    className="shrink-0 p-1 text-gray-300 hover:text-gray-500 transition-colors"
                    title="ยกเลิก"
                  >
                    {dismissing === alert.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <BellOff size={14} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
