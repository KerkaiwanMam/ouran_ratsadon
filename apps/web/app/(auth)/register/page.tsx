"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle2, Circle } from "lucide-react";

function PasswordStrength({ password }: { password: string }) {
  const rules = [
    { label: "อย่างน้อย 8 ตัวอักษร", pass: password.length >= 8 },
    { label: "มีตัวเลข", pass: /\d/.test(password) },
    { label: "มีตัวพิมพ์ใหญ่", pass: /[A-Z]/.test(password) },
  ];
  return (
    <div className="flex flex-col gap-1 mt-1.5">
      {rules.map((r) => (
        <div key={r.label} className="flex items-center gap-1.5 text-xs">
          {r.pass ? (
            <CheckCircle2 size={12} className="text-green-500" />
          ) : (
            <Circle size={12} className="text-gray-300" />
          )}
          <span className={r.pass ? "text-green-600 dark:text-green-400" : "text-gray-400"}>
            {r.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "เกิดข้อผิดพลาด");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-[#7F77DD]">
            อุรัณ รัษฎร
          </Link>
          <h1 className="text-xl font-bold mt-3 text-gray-900 dark:text-gray-100">
            สมัครสมาชิกฟรี
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            รับ 3 ไฟล์/เดือน ฟรี — ไม่ต้องใส่บัตรเครดิต
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-8">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mb-4"
          >
            <GoogleIcon />
            สมัครด้วย Google
          </a>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400">
              <span className="bg-white dark:bg-gray-900 px-2">หรือกรอกข้อมูล</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ชื่อ-นามสกุล / ชื่อธุรกิจ
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="เช่น สมชาย วิสาหกิจ"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F77DD] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                อีเมล
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F77DD] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 pr-10 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F77DD] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && <PasswordStrength password={password} />}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#7F77DD] text-white font-semibold rounded-xl hover:bg-[#534AB7] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "กำลังสมัคร..." : "สมัครสมาชิกฟรี"}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
            การสมัครถือว่าคุณยอมรับ{" "}
            <Link href="/terms" className="text-[#7F77DD] hover:underline">
              เงื่อนไขการใช้งาน
            </Link>{" "}
            และ{" "}
            <Link href="/privacy" className="text-[#7F77DD] hover:underline">
              นโยบายความเป็นส่วนตัว
            </Link>
          </p>

          <div className="mt-5 text-center text-sm text-gray-600 dark:text-gray-400">
            มีบัญชีแล้ว?{" "}
            <Link href="/login" className="text-[#7F77DD] font-medium hover:underline">
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
