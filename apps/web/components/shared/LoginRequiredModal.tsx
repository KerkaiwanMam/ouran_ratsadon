"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Lock, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Path to return to after login — appended as ?next=… */
  nextPath?: string;
  /** Override the default message, e.g. "กรุณาเข้าสู่ระบบก่อนให้คะแนนโครงการ" */
  message?: string;
}

/**
 * "ต้องเข้าสู่ระบบก่อน" popup — shown when a guest triggers an action that
 * requires an account (e.g. rating a project). Reusable across both layers.
 */
export default function LoginRequiredModal({ open, onClose, nextPath, message }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes; focus moves into the dialog when it opens.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
  const registerHref = nextPath
    ? `/register?next=${encodeURIComponent(nextPath)}`
    : "/register";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        onClick={onClose}
        className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm cursor-pointer modal-backdrop-in"
      />

      {/* Card */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-6 outline-none modal-card-in"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="absolute top-3 right-3 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#7F77DD]"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#7F77DD]/10 flex items-center justify-center mb-4">
            <Lock size={22} className="text-[#7F77DD]" aria-hidden="true" />
          </div>
          <h2
            id="login-required-title"
            className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1"
          >
            ต้องเข้าสู่ระบบก่อน
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            {message ?? "กรุณาเข้าสู่ระบบเพื่อใช้งานฟีเจอร์นี้ — สมัครฟรี ใช้เวลาไม่ถึงนาที"}
          </p>

          <div className="w-full space-y-2">
            <Link
              href={loginHref}
              className="block w-full py-2.5 bg-[#7F77DD] text-white text-sm font-semibold rounded-xl hover:bg-[#534AB7] transition-colors text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#534AB7]"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href={registerHref}
              className="block w-full py-2.5 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7F77DD]"
            >
              สมัครสมาชิกฟรี
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
