"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  PieChart,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const OAUTH_ERRORS: Record<string, string> = {
  oauth_denied: "ยกเลิกการเข้าสู่ระบบด้วย Google",
  oauth_invalid: "ลิงก์ OAuth ไม่ถูกต้อง กรุณาลองใหม่",
  oauth_state_mismatch: "เกิดข้อผิดพลาดด้านความปลอดภัย กรุณาลองใหม่",
  oauth_failed: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่",
  email_not_verified: "อีเมล Google ยังไม่ได้รับการยืนยัน",
  account_banned: "บัญชีนี้ถูกระงับการใช้งาน",
};

const FEATURES = [
  {
    icon: PieChart,
    title: "สำรวจงบประมาณแผ่นดิน",
    desc: "Treemap interactive เจาะลึกได้ถึงระดับโครงการ",
  },
  {
    icon: TrendingUp,
    title: "วิเคราะห์การเงินธุรกิจ",
    desc: "อัปโหลดไฟล์ ดู cash flow และจุดรั่วไหลทันที",
  },
  {
    icon: ShieldCheck,
    title: "ข้อมูลปลอดภัย",
    desc: "ข้อมูลธุรกิจของคุณเข้ารหัสและเป็นส่วนตัวเสมอ",
  },
];

/** Only allow same-site relative paths as a post-login destination. */
function sanitizeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextPath = sanitizeNext(searchParams.get("next"));

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) setError(OAUTH_ERRORS[oauthError] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "เกิดข้อผิดพลาด");
        return;
      }
      // Return to the page that required login, or the dashboard by default.
      router.push(nextPath ?? "/dashboard");
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  const googleHref = nextPath
    ? `/api/auth/google?next=${encodeURIComponent(nextPath)}`
    : "/api/auth/google";

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-gray-950">
      {/* ── Left: brand panel (desktop only) ─────────────────────────────── */}
      <section
        aria-hidden="true"
        className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-gradient-to-br from-[#3C3489] via-[#534AB7] to-[#7F77DD] p-12 text-white"
      >
        {/* Decorative shapes */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#AFA9EC]/20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 right-12 w-40 h-40 rounded-3xl border border-white/15 rotate-12" />
        <div className="pointer-events-none absolute top-1/2 right-28 w-24 h-24 rounded-2xl border border-white/10 -rotate-6" />

        <div className="relative">
          <Link href="/" className="inline-flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">อุรัณ รัษฎร</span>
            <span className="text-sm text-white/70 font-medium">Budget Intelligence</span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-snug mb-3">
            เห็นทุกบาทของงบประมาณรัฐ
            <br />
            เข้าใจทุกบาทของธุรกิจคุณ
          </h2>
          <p className="text-white/75 leading-relaxed mb-10">
            แพลตฟอร์มเดียวที่รวมความโปร่งใสของข้อมูลภาครัฐ
            เข้ากับเครื่องมือวิเคราะห์การเงินสำหรับ SME
          </p>

          <ul className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/65">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          ข้อมูลงบประมาณจากเอกสารงบประมาณรายจ่ายประจำปี (ข้อมูลสาธารณะ)
        </p>
      </section>

      {/* ── Right: login form ─────────────────────────────────────────────── */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* Compact brand header on mobile (brand panel is hidden) */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-[#7F77DD]">
              อุรัณ รัษฎร
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ยินดีต้อนรับกลับ
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              เข้าสู่ระบบเพื่อใช้งานแดชบอร์ดและฟีเจอร์สมาชิก
            </p>
          </div>

          {/* Redirected from a protected page → explain why they're here */}
          {nextPath && (
            <div
              role="status"
              className="mb-4 flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
            >
              <Lock size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                หน้านี้ต้องเข้าสู่ระบบก่อน — ล็อกอินแล้วระบบจะพากลับไปยังหน้าที่คุณต้องการโดยอัตโนมัติ
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400"
            >
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <a
            href={googleHref}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7F77DD]"
          >
            <GoogleIcon />
            เข้าสู่ระบบด้วย Google
          </a>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400">
              <span className="bg-white dark:bg-gray-950 px-3">หรือใช้อีเมล</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                อีเมล
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-3 py-3 text-base sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7F77DD] focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  รหัสผ่าน
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#7F77DD] hover:text-[#534AB7] hover:underline transition-colors"
                >
                  ลืมรหัสผ่าน?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-11 py-3 text-base sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7F77DD] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#7F77DD]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#7F77DD] to-[#534AB7] text-white font-semibold rounded-xl hover:from-[#534AB7] hover:to-[#3C3489] disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#7F77DD]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#534AB7]"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  เข้าสู่ระบบ
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            ยังไม่มีบัญชี?{" "}
            <Link
              href={nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : "/register"}
              className="text-[#7F77DD] font-semibold hover:text-[#534AB7] hover:underline transition-colors"
            >
              สมัครสมาชิกฟรี
            </Link>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            หรือ{" "}
            <Link
              href="/explore"
              className="text-[#7F77DD] hover:text-[#534AB7] hover:underline transition-colors"
            >
              สำรวจงบประมาณรัฐโดยไม่ต้องเข้าสู่ระบบ →
            </Link>
          </p>
        </div>
      </section>
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
