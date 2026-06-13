import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Reveal from "@/components/shared/Reveal";
import CityScape from "@/components/shared/CityScape";
import {
  getAvailableYears,
  getBudgetYear,
  computeMinistryList,
  computeProjectCount,
} from "@/lib/civic-cache";
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

/** Load the latest fiscal year's ministry budgets from the civic cache
 *  (server component — same data source as /explore). */
function getLatestMinistries() {
  const years = getAvailableYears();
  const latestYear = years[years.length - 1] ?? "2568";
  const budget = getBudgetYear(latestYear);
  if (!budget) {
    return {
      latestYear,
      totalBudget: 0,
      projectCount: 0,
      ministryCount: 0,
      ministries: [] as ReturnType<typeof computeMinistryList>,
    };
  }
  const fullList = computeMinistryList(budget);
  const ministries = [...fullList].sort((a, b) => b.budget - a.budget).slice(0, 10);
  return {
    latestYear,
    totalBudget: budget.total_budget,
    projectCount: computeProjectCount(budget),
    ministryCount: fullList.length,
    ministries,
  };
}

function buildWhyStats(latestYear: string, totalBudget: number) {
  return [
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
      stat: totalBudget > 0 ? `฿${(totalBudget / 1e12).toFixed(2)}T` : "฿3.75T",
      label: `งบประมาณ ${latestYear}`,
      desc: "ข้อมูลสาธารณะที่มีอยู่แต่ขาดเครื่องมือวิเคราะห์ที่เข้าถึงได้",
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { latestYear, totalBudget, projectCount, ministryCount, ministries } =
    getLatestMinistries();

  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-16">

        {/* ── Hero — cyberpunk night-city stage (always dark) ──────────────── */}
        <section className="scanlines relative overflow-hidden bg-gradient-to-b from-[#0A0E27] via-[#10142e] to-[#131233]">
          {/* City-plan blueprint grid over the night sky */}
          <div
            className="pointer-events-none absolute inset-0 bg-blueprint-grid [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
            style={{
              "--grid-line": "rgba(45,212,191,0.05)",
              "--grid-line-major": "rgba(45,212,191,0.1)",
            } as React.CSSProperties}
            aria-hidden="true"
          />
          {/* Dual-mode neon glows */}
          <div
            className="pointer-events-none absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-cyan-500/15 via-violet-500/10 to-pink-500/15 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-10 -left-40 w-[440px] h-[440px] rounded-full bg-gradient-to-tr from-amber-500/10 to-teal-500/15 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-6xl mx-auto px-5 pt-16 md:pt-24 pb-8">
            <div className="max-w-2xl">
              {/* Badge */}
              <span
                className="hero-enter inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-white/10 border border-white/10 text-purple-300 rounded-full mb-5 backdrop-blur-sm"
                style={{ "--enter-delay": "0ms" } as React.CSSProperties}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#AFA9EC] animate-pulse"
                  aria-hidden="true"
                />
                Portfolio Project · Open Source
              </span>

              {/* Headline — neon keywords carry their destination mode's colors */}
              <h1
                className="hero-enter text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white leading-tight mb-5 tracking-tight"
                style={{ "--enter-delay": "90ms" } as React.CSSProperties}
              >
                งบประมาณไทย
                <br />
                <span className="bg-gradient-to-r from-amber-400 to-teal-300 bg-clip-text text-transparent [filter:drop-shadow(0_0_18px_rgba(45,212,191,0.35))]">
                  โปร่งใส
                </span>{" "}
                <span className="text-gray-500 font-normal">และ</span>{" "}
                <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent [filter:drop-shadow(0_0_18px_rgba(139,92,246,0.35))]">
                  วิเคราะห์ได้
                </span>
              </h1>

              {/* Subheadline */}
              <p
                className="hero-enter text-lg text-gray-300 mb-8 leading-relaxed"
                style={{ "--enter-delay": "180ms" } as React.CSSProperties}
              >
                สองชั้นในแพลตฟอร์มเดียว —{" "}
                <strong className="text-white font-semibold">Civic Layer</strong>{" "}
                สำหรับตรวจสอบงบประมาณรัฐ<span className="text-emerald-400 font-semibold">ฟรี</span> และ{" "}
                <strong className="text-white font-semibold">Business Layer</strong>{" "}
                สำหรับ SME วิเคราะห์ค่าใช้จ่ายธุรกิจ
              </p>

              {/* CTAs */}
              <div
                className="hero-enter flex flex-wrap gap-3 mb-8"
                style={{ "--enter-delay": "270ms" } as React.CSSProperties}
              >
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7F77DD] text-white text-sm font-semibold rounded-xl hover:bg-[#534AB7] transition-colors duration-150 shadow-[0_0_28px_rgba(127,119,221,0.45)]"
                >
                  ดูงบประมาณรัฐ
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/20 text-gray-200 text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors duration-150"
                >
                  วิเคราะห์ธุรกิจฟรี
                </Link>
              </div>

              {/* Trust signals */}
              <div
                className="hero-enter flex flex-wrap items-center gap-x-5 gap-y-2"
                style={{ "--enter-delay": "360ms" } as React.CSSProperties}
              >
                {[
                  "ไม่ต้อง login สำหรับ Civic Layer",
                  "ข้อมูลจาก bb.go.th",
                  "Open Source",
                ].map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1.5 text-xs text-gray-400"
                  >
                    <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Floating stat chips — fill the night sky on wide screens */}
          <div className="pointer-events-none absolute inset-0 z-10 hidden lg:block" aria-hidden="true">
            <div className="float-a absolute right-[8%] top-28 surface-glass !bg-white/5 !border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-widest text-gray-400">งบประมาณปี {latestYear}</p>
              <p className="text-xl font-black bg-gradient-to-r from-amber-400 to-teal-300 bg-clip-text text-transparent">
                ฿{(totalBudget / 1e12).toFixed(2)} ล้านล้าน
              </p>
            </div>
            <div className="float-b absolute right-[26%] top-52 surface-glass !bg-white/5 !border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-widest text-gray-400">กระทรวง</p>
              <p className="text-xl font-black text-cyan-300">{ministryCount} หน่วยงาน</p>
            </div>
            <div className="float-c absolute right-[6%] top-[19rem] surface-glass !bg-white/5 !border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-widest text-gray-400">โครงการทั้งหมด</p>
              <p className="text-xl font-black text-pink-300">{projectCount.toLocaleString()} โครงการ</p>
            </div>
          </div>

          {/* Animated city panorama — buildings, river, road, lamps, trees, people */}
          <CityScape className="relative block w-full h-[230px] md:h-[300px] -mt-6" />
        </section>

        {/* ── Ministry budget marquee — latest year, real data ──────────────── */}
        <section className="bg-[#0d1026] py-7 overflow-hidden border-t border-white/5">
          <div className="max-w-6xl mx-auto px-5 mb-4 flex items-center justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
              งบประมาณรายกระทรวง · ปีงบประมาณ {latestYear} · Top 10
            </p>
            <Link
              href="/explore"
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors inline-flex items-center gap-1"
            >
              ดูทั้งหมดใน Explorer
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>

          {ministries.length > 0 && (
            <div className="marquee relative">
              {/* edge fades */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-[#0d1026] to-transparent"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-[#0d1026] to-transparent"
                aria-hidden="true"
              />
              <div className="marquee-track gap-3 px-5">
                {[...ministries, ...ministries].map((m, i) => {
                  const isClone = i >= ministries.length;
                  const rank = (i % ministries.length) + 1;
                  return (
                    <Link
                      key={`${m.id}-${i}`}
                      href={`/ministry/${m.id}?year=${latestYear}`}
                      aria-hidden={isClone}
                      tabIndex={isClone ? -1 : undefined}
                      className="w-[250px] shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 rounded-xl p-3.5 transition-colors duration-200 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${
                            rank <= 3 ? "bg-amber-400/15 text-amber-300" : "bg-white/10 text-gray-400"
                          }`}
                        >
                          {rank}
                        </span>
                        <p className="text-xs text-gray-300 group-hover:text-white font-medium truncate">
                          {m.name}
                        </p>
                      </div>
                      <p className="text-lg font-black bg-gradient-to-r from-amber-400 to-teal-300 bg-clip-text text-transparent w-fit leading-none">
                        ฿{(m.budget / 1e9).toLocaleString("th-TH", { maximumFractionDigits: 1 })}
                        <span className="text-[10px] font-semibold text-gray-500 ml-1">พันล้าน</span>
                      </p>
                      <div className="flex items-center gap-2 mt-2.5">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-teal-400"
                            style={{ width: `${Math.min(m.percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 tabular-nums shrink-0">
                          {m.percentage.toFixed(1)}%
                        </span>
                        {m.redFlagCount > 0 && (
                          <span className="text-[10px] text-red-400 font-semibold shrink-0">
                            ⚑ {m.redFlagCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── Two-layer concept — each card is a "portal" styled in its
               destination mode's theme (scoped data-theme) ─────────────────── */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="max-w-6xl mx-auto px-5">
            <Reveal>
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  สองชั้น หนึ่งแพลตฟอร์ม
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
                  Civic Layer สร้างความเชื่อมั่น — Business Layer สร้างรายได้
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Civic Layer card — blueprint grid + amber/teal (governance) */}
              <Reveal className="h-full">
                <div
                  data-theme="civic"
                  className="relative h-full border-2 border-accent/30 rounded-2xl p-7 overflow-hidden bg-white dark:bg-gray-900 bg-blueprint-grid hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 transition-[transform,box-shadow] duration-300"
                >
                  <div
                    className="pointer-events-none absolute top-0 right-0 w-40 h-40 bg-accent-soft rounded-full -translate-y-10 translate-x-10 opacity-60"
                    aria-hidden="true"
                  />
                  <div className="relative">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-3 block">
                      ชั้น 1 — Civic Layer
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      งบอุ้มราษฎร Explorer
                    </h3>
                    <p className="text-3xl font-black text-gradient-accent mb-5">ฟรี</p>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                      ประชาชนทุกคนสามารถสำรวจงบประมาณแผ่นดินไทย
                      ตรวจสอบโครงการที่น่าสงสัย และดาวน์โหลดข้อมูลได้โดยไม่ต้องสมัครสมาชิก
                    </p>
                    <ul className="space-y-3 mb-7">
                      {CIVIC_FEATURES.map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <span className="text-accent-2 flex-shrink-0 mt-0.5" aria-hidden="true">
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
                      className="inline-flex items-center gap-2 w-full justify-center py-2.5 bg-gradient-accent text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity duration-150"
                    >
                      เปิด Explorer
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </Reveal>

              {/* Business Layer card — glassmorphism + cyan→violet→pink gradient ring */}
              <Reveal delay={120} className="h-full">
                <div
                  data-theme="business"
                  className="relative h-full rounded-2xl p-[1.5px] bg-gradient-accent hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/15 transition-[transform,box-shadow] duration-300"
                >
                  <div className="relative h-full surface-glass rounded-[15px] p-7 overflow-hidden bg-white/90 dark:bg-gray-900/80">
                    <div
                      className="pointer-events-none absolute -bottom-16 -right-16 w-48 h-48 bg-gradient-accent opacity-10 rounded-full blur-2xl"
                      aria-hidden="true"
                    />
                    <div className="relative">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gradient-accent mb-3 block w-fit">
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
                            <span className="text-accent flex-shrink-0 mt-0.5" aria-hidden="true">
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
                        className="inline-flex items-center gap-2 w-full justify-center py-2.5 bg-gradient-accent text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity duration-150"
                      >
                        เริ่มต้นฟรี
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Why section ───────────────────────────────────────────────────── */}
        <section className="py-20 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-4xl mx-auto px-5 text-center">
            <Reveal>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                ทำไมถึงสร้างแพลตฟอร์มนี้?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-12">
                ปัญหาจริง · ข้อมูลจริง · เครื่องมือที่ขาดหายไป
              </p>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
              {buildWhyStats(latestYear, totalBudget).map((item, i) => (
                <Reveal key={i} delay={i * 100} className="h-full">
                  <div className="h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-[#7F77DD]/40 hover:shadow-lg hover:shadow-[#7F77DD]/5 transition-[border-color,box-shadow] duration-200">
                    <p className="text-3xl font-black text-gradient-accent mb-1.5 w-fit">{item.stat}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </Reveal>
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
          {/* Both modes converge: civic glow left, business glow right */}
          <div
            className="pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-gradient-to-tr from-amber-400/25 to-teal-400/25 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-gradient-to-bl from-cyan-400/25 to-pink-400/25 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl mx-auto px-5 text-center">
            <Reveal>
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
            </Reveal>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
