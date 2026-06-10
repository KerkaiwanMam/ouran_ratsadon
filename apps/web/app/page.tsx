import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  ArrowRight,
  Search,
  BarChart3,
  Shield,
  TrendingUp,
  AlertTriangle,
  Globe,
  CheckCircle2,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CIVIC_FEATURES = [
  {
    icon: <BarChart3 size={16} aria-hidden="true" />,
    title: "Treemap แบบ Interactive",
    desc: "สำรวจงบประมาณแผ่นดินด้วยภาพ Treemap แบบ drill-down ถึงระดับโครงการ",
  },
  {
    icon: <AlertTriangle size={16} aria-hidden="true" />,
    title: "Red Flag Detection",
    desc: "ระบบ Rule-based ตรวจจับโครงการที่งบเพิ่มผิดปกติ, มูลค่าสูง, หรืออาจซ้ำซ้อน",
  },
  {
    icon: <Search size={16} aria-hidden="true" />,
    title: "ค้นหาขั้นสูง",
    desc: "กรองตามกระทรวง ประเภทงบ วงเงิน สถานะ ได้ในทุก perspective",
  },
  {
    icon: <Globe size={16} aria-hidden="true" />,
    title: "Open Data",
    desc: "ดาวน์โหลดข้อมูลงบประมาณเป็น CSV/JSON ฟรี เพื่อ reuse ใน research ของคุณ",
  },
];

const BUSINESS_FEATURES = [
  {
    icon: <BarChart3 size={16} aria-hidden="true" />,
    title: "Cash Flow Dashboard",
    desc: "อัปโหลด Excel ได้เลย — ระบบจัดหมวดหมู่และสร้าง dashboard ให้อัตโนมัติ",
  },
  {
    icon: <AlertTriangle size={16} aria-hidden="true" />,
    title: "Leak Detection",
    desc: "ตรวจจับค่าใช้จ่ายผิดปกติ: ยอดพุ่ง, จ่ายซ้ำ, outlier — ด้วย 4 กฎอัตโนมัติ",
  },
  {
    icon: <TrendingUp size={16} aria-hidden="true" />,
    title: "Cash Flow Forecast",
    desc: "พยากรณ์กระแสเงินสดด้วยค่าเฉลี่ยถ่วงน้ำหนัก (ไม่ใช่ AI — บอกตรงๆ)",
  },
  {
    icon: <Shield size={16} aria-hidden="true" />,
    title: "แผนรองรับทุกขนาด",
    desc: "Free 3 ไฟล์/เดือน • Pro ฿299/เดือน • Team ฿799/เดือน",
  },
];

const RED_FLAG_EXAMPLES = [
  {
    project: "โครงการจัดซื้ออาวุธยุทโธปกรณ์ทางบก",
    ministry: "กระทรวงกลาโหม",
    change: "+185.7%",
    severity: "critical",
  },
  {
    project: "โครงการรถไฟความเร็วสูงไทย-จีน",
    ministry: "การรถไฟแห่งประเทศไทย",
    change: "+150%",
    severity: "critical",
  },
  {
    project: "โครงการระบบ Digital ID แห่งชาติ",
    ministry: "กระทรวงดิจิทัล",
    change: "+353%",
    severity: "critical",
  },
  {
    project: "โครงการจ้างที่ปรึกษาพิเศษนายกรัฐมนตรี",
    ministry: "สำนักนายกรัฐมนตรี",
    change: "+128%",
    severity: "warning",
  },
];

const WHY_STATS = [
  {
    stat: "33/100",
    label: "CPI ไทยปี 2025",
    desc: "ดัชนีภาพลักษณ์การทุจริต ต่ำสุดในรอบ 14 ปี (อันดับ 116 จาก 182 ประเทศ)",
  },
  {
    stat: "#1",
    label: "เหตุ SME ล้มละลาย",
    desc: "Cash Flow Management คือสาเหตุอันดับ 1 ที่ทำให้ SME ปิดกิจการ",
  },
  {
    stat: "฿3.75T",
    label: "งบประมาณ 2568",
    desc: "ข้อมูลสาธารณะที่มีอยู่แต่ขาดเครื่องมือวิเคราะห์ที่เข้าถึงได้",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-16">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-purple-50/40 to-white dark:from-gray-950 dark:via-purple-950/20 dark:to-gray-950">
          {/* Decorative background blob */}
          <div
            className="pointer-events-none absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-[#7F77DD]/8 dark:bg-[#7F77DD]/5 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative max-w-6xl mx-auto px-5 py-20 md:py-28">
            <div className="max-w-2xl">
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-[#7F77DD] rounded-full mb-5">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#7F77DD] animate-pulse"
                  aria-hidden="true"
                />
                Portfolio Project · Open Source
              </span>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-5 tracking-tight">
                งบประมาณไทย
                <br />
                <span className="text-[#7F77DD]">โปร่งใส</span>{" "}
                <span className="text-gray-400 dark:text-gray-600 font-normal">และ</span>{" "}
                <span className="text-[#7F77DD]">วิเคราะห์ได้</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                สองชั้นในแพลตฟอร์มเดียว —{" "}
                <strong className="text-gray-800 dark:text-gray-200 font-semibold">Civic Layer</strong>{" "}
                สำหรับตรวจสอบงบประมาณรัฐ<span className="text-[#1D9E75] font-semibold">ฟรี</span> และ{" "}
                <strong className="text-gray-800 dark:text-gray-200 font-semibold">Business Layer</strong>{" "}
                สำหรับ SME วิเคราะห์ค่าใช้จ่ายธุรกิจ
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 mb-10">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7F77DD] text-white text-sm font-semibold rounded-xl hover:bg-[#534AB7] transition-colors duration-150 shadow-md shadow-[#7F77DD]/20"
                >
                  ดูงบประมาณรัฐ
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                >
                  วิเคราะห์ธุรกิจฟรี
                </Link>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {[
                  "ไม่ต้อง login สำหรับ Civic Layer",
                  "ข้อมูลจาก bb.go.th",
                  "Open Source",
                ].map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
                  >
                    <CheckCircle2 size={12} className="text-[#1D9E75] flex-shrink-0" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Red Flag preview strip ────────────────────────────────────────── */}
        <section className="bg-gray-900 dark:bg-gray-950 py-6 overflow-hidden">
          <div className="max-w-6xl mx-auto px-5">
            <p className="text-[10px] text-gray-500 mb-3 uppercase tracking-widest font-semibold">
              ตัวอย่าง Red Flags ปีงบประมาณ 2568
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {RED_FLAG_EXAMPLES.map((item, i) => (
                <Link
                  key={i}
                  href="/explore"
                  className="flex items-start gap-3 bg-gray-800/80 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl p-3.5 transition-colors duration-150 group cursor-pointer"
                >
                  <span
                    className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full ${
                      item.severity === "critical" ? "bg-red-500" : "bg-amber-400"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-200 group-hover:text-white font-medium line-clamp-2 leading-snug mb-0.5">
                      {item.project}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{item.ministry}</p>
                    <p
                      className={`text-sm font-bold mt-1.5 ${
                        item.severity === "critical" ? "text-red-400" : "text-amber-400"
                      }`}
                    >
                      {item.change}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Two-layer concept ────────────────────────────────────────────── */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                สองชั้น หนึ่งแพลตฟอร์ม
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
                Civic Layer สร้างความเชื่อมั่น — Business Layer สร้างรายได้
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Civic Layer card */}
              <div className="relative border-2 border-[#7F77DD] rounded-2xl p-7 overflow-hidden group hover:shadow-xl hover:shadow-[#7F77DD]/10 transition-shadow duration-300">
                <div
                  className="pointer-events-none absolute top-0 right-0 w-40 h-40 bg-purple-100/60 dark:bg-purple-900/15 rounded-full -translate-y-10 translate-x-10"
                  aria-hidden="true"
                />
                <div className="relative">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#7F77DD] mb-3 block">
                    ชั้น 1 — Civic Layer
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    งบอุ้มราษฎร Explorer
                  </h3>
                  <p className="text-3xl font-black text-[#7F77DD] mb-5">ฟรี</p>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                    ประชาชนทุกคนสามารถสำรวจงบประมาณแผ่นดินไทย
                    ตรวจสอบโครงการที่น่าสงสัย และดาวน์โหลดข้อมูลได้โดยไม่ต้องสมัครสมาชิก
                  </p>
                  <ul className="space-y-3 mb-7">
                    {CIVIC_FEATURES.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="text-[#7F77DD] flex-shrink-0 mt-0.5" aria-hidden="true">
                          {f.icon}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                            {f.title}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                            {f.desc}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 w-full justify-center py-2.5 bg-[#7F77DD] text-white text-sm font-semibold rounded-xl hover:bg-[#534AB7] transition-colors duration-150"
                  >
                    เปิด Explorer
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Business Layer card */}
              <div className="relative border border-gray-200 dark:border-gray-700 rounded-2xl p-7 overflow-hidden group hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 transition-shadow duration-300">
                <div
                  className="pointer-events-none absolute top-0 right-0 w-40 h-40 bg-gray-100/60 dark:bg-gray-800/40 rounded-full -translate-y-10 translate-x-10"
                  aria-hidden="true"
                />
                <div className="relative">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 block">
                    ชั้น 2 — Business Layer
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    SME Expense Intelligence
                  </h3>
                  <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-1">
                    ฟรี
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      {" "}/ Pro ฿299/เดือน
                    </span>
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-5">
                    ฟรี 3 ไฟล์/เดือน — ไม่ต้องใส่บัตรเครดิต
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                    อัปโหลด Excel ค่าใช้จ่ายธุรกิจ — ระบบจัดหมวดหมู่อัตโนมัติ
                    ตรวจจับจุดรั่วไหล และพยากรณ์กระแสเงินสด
                  </p>
                  <ul className="space-y-3 mb-7">
                    {BUSINESS_FEATURES.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" aria-hidden="true">
                          {f.icon}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                            {f.title}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                            {f.desc}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 w-full justify-center py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    เริ่มต้นฟรี
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Why section ───────────────────────────────────────────────────── */}
        <section className="py-20 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-4xl mx-auto px-5 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              ทำไมถึงสร้างแพลตฟอร์มนี้?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-12">
              ปัญหาจริง · ข้อมูลจริง · เครื่องมือที่ขาดหายไป
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
              {WHY_STATS.map((item, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-[#7F77DD]/40 transition-colors duration-200"
                >
                  <p className="text-3xl font-black text-[#7F77DD] mb-1.5">{item.stat}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section className="py-16 bg-[#7F77DD] relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#534AB7]/30 to-transparent"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl mx-auto px-5 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              เริ่มต้นได้เลย — ฟรี ไม่ต้องสมัคร
            </h2>
            <p className="text-purple-200 mb-8 text-sm">
              Civic Layer ไม่ต้อง login — เปิดเบราว์เซอร์แล้วสำรวจงบประมาณได้เลย
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#7F77DD] text-sm font-semibold rounded-xl hover:bg-purple-50 transition-colors duration-150 shadow-lg shadow-black/10"
              >
                เปิด Budget Explorer
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/40 text-white text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors duration-150"
              >
                <Search size={15} aria-hidden="true" />
                ค้นหาโครงการ
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
