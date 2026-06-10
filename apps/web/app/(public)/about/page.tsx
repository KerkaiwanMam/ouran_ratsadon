import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Github, Globe, Database, Code2 } from "lucide-react";

const TECH_STACK = [
  { label: "Frontend", items: "Next.js 14 · TypeScript · Tailwind CSS · Recharts" },
  { label: "Backend", items: "Node.js API Routes · Prisma ORM · SQLite/PostgreSQL" },
  { label: "Auth", items: "JWT (jose) · bcryptjs · httpOnly cookie" },
  { label: "Parser", items: "Python FastAPI · pdfplumber · openpyxl (Phase 1)" },
  { label: "Deploy", items: "Vercel (frontend) · Railway (Python service)" },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="max-w-3xl mx-auto px-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              เกี่ยวกับ ouran_ratsadon
            </h1>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              <strong className="text-gray-900 dark:text-gray-100">
                อุรัณ รัษฎร (ouran_ratsadon)
              </strong>{" "}
              คือ Portfolio Project ที่สร้างขึ้นเพื่อแสดงให้เห็นว่า
              Full-Stack Development ที่มีคุณภาพเป็นอย่างไร — ทั้งด้าน
              Architecture, UX, และ Real Business Problem Solving
            </p>

            <div className="space-y-8">
              {/* Mission */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Mission
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      icon: <Globe size={20} className="text-[#7F77DD]" />,
                      title: "Civic Transparency",
                      desc: "ทำให้งบประมาณแผ่นดินไทยเข้าถึงได้และเข้าใจได้สำหรับทุกคน ไม่ใช่แค่นักบัญชีหรือนักข่าว",
                    },
                    {
                      icon: <Database size={20} className="text-[#1D9E75]" />,
                      title: "SME Financial Health",
                      desc: "ช่วย SME ไทยเข้าใจกระแสเงินสดของตัวเอง ก่อนที่เงินจะหมดโดยไม่ทันตั้งตัว",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl"
                    >
                      <span className="flex-shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architecture */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Two-Layer Architecture
                </h2>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 font-mono text-sm space-y-1 text-gray-700 dark:text-gray-300">
                  <p className="text-[#7F77DD] font-bold">Layer 1: Civic Layer (Public)</p>
                  <p className="pl-4 text-gray-500">→ Pre-processed government budget data</p>
                  <p className="pl-4 text-gray-500">→ In-memory cache (loaded once at server start)</p>
                  <p className="pl-4 text-gray-500">→ No auth, full open data</p>
                  <p className="mt-2 text-[#1D9E75] font-bold">Layer 2: Business Layer (Auth required)</p>
                  <p className="pl-4 text-gray-500">→ User uploads own financial data</p>
                  <p className="pl-4 text-gray-500">→ SQLite (dev) / PostgreSQL (prod) via Prisma</p>
                  <p className="pl-4 text-gray-500">→ Freemium subscription model</p>
                </div>
              </div>

              {/* Tech stack */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Code2 size={20} />
                  Tech Stack
                </h2>
                <dl className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {TECH_STACK.map((row) => (
                    <div
                      key={row.label}
                      className="flex gap-4 px-4 py-3 text-sm"
                    >
                      <dt className="w-24 flex-shrink-0 font-medium text-gray-500 dark:text-gray-400">
                        {row.label}
                      </dt>
                      <dd className="text-gray-800 dark:text-gray-200">{row.items}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Key decisions */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Design Decisions
                </h2>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {[
                    "Civic Layer ใช้ in-memory cache แทน DB query — ข้อมูลรัฐอัปเดตปีละครั้ง ไม่ต้องการ real-time",
                    "การพยากรณ์ใช้ WMA ไม่ใช่ ML — บอกตรงๆ เพื่อสร้างความเชื่อมั่น",
                    "Phase 0 ไม่มี Payment integration — ใช้ manual billing เพื่อโฟกัสที่ core UX",
                    "JWT ใน httpOnly cookie แทน localStorage — ป้องกัน XSS",
                    "SQLite สำหรับ dev — migrate เป็น PostgreSQL บน production ได้ง่ายผ่าน Prisma",
                  ].map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#7F77DD] flex-shrink-0">→</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#7F77DD] text-white rounded-lg text-sm font-medium hover:bg-[#534AB7] transition-colors"
                >
                  <Globe size={14} />
                  ดู Live Demo
                </Link>
                <a
                  href="https://github.com/KerkkaiwanMam/ouran_ratsadon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Github size={14} />
                  Source Code
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
