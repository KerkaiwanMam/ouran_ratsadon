import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  Github,
  Globe,
  Database,
  Code2,
  CheckCircle2,
  Wrench,
  Rocket,
  Compass,
  Landmark,
  Briefcase,
} from "lucide-react";

const TECH_STACK = [
  { label: "Frontend", items: "Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts · D3.js · Leaflet" },
  { label: "Backend", items: "Next.js API Routes (Node) · Prisma ORM · PostgreSQL (Neon)" },
  { label: "Parser", items: "Python FastAPI · pdfplumber · openpyxl/pandas" },
  { label: "Infra", items: "Edge rate limiting (Upstash Redis) · Cloudflare R2 (file storage) · Resend (email)" },
  { label: "Auth", items: "JWT (jose) · bcryptjs · httpOnly cookie · Google OAuth" },
  { label: "Deploy", items: "Vercel (frontend) · Railway/Render (Python service)" },
];

const CIVIC_FEATURES = [
  "สำรวจงบประมาณแบบ Treemap/Sunburst เจาะลึกได้ถึงระดับกระทรวง → กรม → โครงการ",
  "ค้นหาขั้นสูงพร้อมตัวกรองหลายมิติ ตารางผลลัพธ์ และส่งออกข้อมูลเป็น CSV",
  "หน้ารายละเอียดโครงการ ประวัติย้อนหลัง 5 ปี พร้อมคำอธิบาย Red Flag",
  "เปรียบเทียบปีงบประมาณหรือกระทรวงแบบเคียงข้างกัน",
  "ภาพรวมการคลังประเทศ (รายรับ-รายจ่าย-หนี้สาธารณะ) ด้วยกราฟแบบ interactive",
  "Widget แบบฝังได้สำหรับสื่อ/นักวิจัย พร้อมระบบให้คะแนนและความเห็นต่อโครงการ",
];

const BUSINESS_FEATURES = [
  "อัปโหลดไฟล์ Excel, รายการเดินบัญชี หรือไฟล์จากโปรแกรมบัญชี แล้วจัดหมวดอัตโนมัติ",
  "แดชบอร์ดกระแสเงินสด เทียบเดือนต่อเดือน พร้อม Burn Rate และ Cash Runway",
  "วิเคราะห์เชิงลึก 4 ระดับ: สรุปภาพรวม → วินิจฉัยความผิดปกติ → พยากรณ์ (WMA + ดัชนีฤดูกาล) → คำแนะนำเชิงรุก",
  "ตรวจจับความผิดปกติของรายจ่าย เช่น ค่าใช้จ่ายพุ่งผิดปกติ หรือรายการซ้ำ [Pro]",
  "รายงานคู่ค้า/ผู้ให้บริการ พร้อมแนวโน้มการใช้จ่ายรายเดือน [Pro]",
  "ผู้ช่วย AI ถาม-ตอบเรื่องการเงินของธุรกิจ ทุกคำตอบมีลิงก์ให้ตรวจสอบย้อนกลับได้ [Pro]",
  "แจ้งเตือนผ่านอีเมล/LINE เมื่อรายจ่ายเกินงบหรือเงินสดใกล้หมด [Pro]",
];

const DEV_STATUS = [
  {
    icon: <CheckCircle2 size={20} className="text-[#1D9E75]" />,
    accent: "border-l-[#1D9E75]",
    arrow: "text-[#1D9E75]",
    title: "ทำเสร็จแล้ว",
    bullets: [
      "Civic Layer ครบ: สำรวจ ค้นหา เปรียบเทียบงบประมาณ พร้อม Red Flag และภาพรวมการคลังประเทศ",
      "Business Layer ครบ: อัปโหลด แดชบอร์ด วิเคราะห์เชิงลึก 4 ระดับ ตรวจจับความผิดปกติ พยากรณ์ และผู้ช่วย AI",
      "ระบบความปลอดภัยระดับ production — rate limiting, file sanitization และ auth coverage ครบทุกหน้า",
    ],
  },
  {
    icon: <Wrench size={20} className="text-[#BA7517]" />,
    accent: "border-l-[#EF9F27]",
    arrow: "text-[#BA7517]",
    title: "กำลังพัฒนา",
    bullets: [
      "ขัดเกลาประสบการณ์ใช้งานของ Business Layer ตามโมเดล 3 ชั้น (Narrative → Evidence → Shared Truth)",
      "เพิ่มบทสรุปภาษาคนและลิงก์ตรวจสอบที่มาของตัวเลขให้ครบทุกหน้า",
      "เก็บข้อมูลใช้งานจริงเพื่อปรับกฎตรวจจับความผิดปกติให้แม่นยำขึ้น",
    ],
  },
  {
    icon: <Rocket size={20} className="text-[#7F77DD]" />,
    accent: "border-l-[#7F77DD]",
    arrow: "text-[#7F77DD]",
    title: "วางแผนต่อไป — เฟส 1",
    bullets: [
      "เชื่อมต่อโมเดลภาษาแบบ free-tier (เช่น Google Gemini) ให้ผู้ช่วย AI",
      "ตอบคำถามแบบอิสระได้ลึกขึ้นกว่ารูปแบบคำถามสำเร็จรูปปัจจุบัน",
      "ยังอ้างอิงข้อมูลที่ผ่านการตรวจสอบแล้วเหมือนเดิม ไม่เปิดให้โมเดลเข้าถึงข้อมูลดิบ",
    ],
  },
  {
    icon: <Compass size={20} className="text-[#534AB7]" />,
    accent: "border-l-[#534AB7]",
    arrow: "text-[#534AB7]",
    title: "วางแผนต่อไป — เฟส 2",
    bullets: [
      "ขยาย Fiscal Intelligence ไปถึงระดับผู้รับเหมา/คู่สัญญาภาครัฐ",
      "Red Flag รายผู้รับเหมา สำหรับตรวจจับความผิดปกติเชิงผู้รับงาน",
      "โปรไฟล์บริษัทที่เชื่อมโยงกับข้อมูลจัดซื้อจัดจ้าง (e-GP) เพื่อตรวจสอบความเชื่อมโยงระหว่างงบประมาณกับผู้รับงาน",
    ],
  },
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
              คือ Portfolio Project ที่สร้างขึ้นเพื่อแสดงให้เห็นว่า Full-Stack
              Development ที่มีคุณภาพเป็นอย่างไร — ตั้งแต่การออกแบบ
              Architecture, การวาง UX ให้ใช้งานง่าย ไปจนถึงการแก้ปัญหาทางธุรกิจจริง
              ผ่านสองโลกที่ดูต่างกันแต่ใช้โครงสร้างเดียวกัน: งบประมาณแผ่นดิน และการเงินของธุรกิจ SME
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
                  Three-Layer Architecture
                </h2>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 font-mono text-sm space-y-1 text-gray-700 dark:text-gray-300">
                  <p className="text-[#7F77DD] font-bold">Civic Layer (Public — ไม่ต้อง login)</p>
                  <p className="pl-4 text-gray-500">→ ข้อมูลงบประมาณภาครัฐที่ผ่านการประมวลผลล่วงหน้า</p>
                  <p className="pl-4 text-gray-500">→ In-memory cache (โหลดครั้งเดียวตอนเริ่มเซิร์ฟเวอร์) + Postgres สำหรับค้นหา/กรอง</p>
                  <p className="pl-4 text-gray-500">→ เปิดเป็นข้อมูลสาธารณะทั้งหมด ไม่มีการยืนยันตัวตน</p>
                  <p className="mt-2 text-[#1D9E75] font-bold">Business Layer (ต้อง login)</p>
                  <p className="pl-4 text-gray-500">→ ผู้ใช้อัปโหลดข้อมูลการเงินของตัวเอง</p>
                  <p className="pl-4 text-gray-500">→ PostgreSQL (Neon) ผ่าน Prisma ทั้ง dev และ production</p>
                  <p className="pl-4 text-gray-500">→ โมเดลสมาชิกแบบ Freemium</p>
                  <p className="mt-2 text-[#534AB7] font-bold">AI-on-Top Layer (Pro — ผู้ช่วย AI)</p>
                  <p className="pl-4 text-gray-500">→ ตอบคำถามจากข้อมูลสรุปที่ตรวจสอบแล้วเท่านั้น ไม่แตะข้อมูลดิบ</p>
                  <p className="pl-4 text-gray-500">→ ทุกคำตอบมีลิงก์ให้กดตรวจสอบที่มา (Evidence)</p>
                </div>
              </div>

              {/* Current features */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  ฟีเจอร์ที่ให้บริการตอนนี้
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <p className="font-semibold text-[#7F77DD] mb-2 flex items-center gap-2">
                      <Globe size={16} />
                      Civic Layer — ฟรี ไม่ต้อง login
                    </p>
                    <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                      {CIVIC_FEATURES.map((f, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[#7F77DD] flex-shrink-0">→</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <p className="font-semibold text-[#1D9E75] mb-2 flex items-center gap-2">
                      <Database size={16} />
                      Business Layer — สมาชิก
                    </p>
                    <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                      {BUSINESS_FEATURES.map((f, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[#1D9E75] flex-shrink-0">→</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Value delivered */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  คุณค่าที่ผู้ใช้ได้รับ
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      icon: <Landmark size={20} className="text-[#7F77DD]" />,
                      title: "ประชาชน นักข่าว นักวิจัย",
                      desc: "เข้าใจว่างบประมาณแผ่นดินไปอยู่ที่ใคร ทำอะไร โดยไม่ต้องมีพื้นฐานบัญชี และสามารถตรวจสอบความโปร่งใสได้ด้วยตัวเองจากข้อมูลเดียวกันทุกหน้า",
                    },
                    {
                      icon: <Briefcase size={20} className="text-[#1D9E75]" />,
                      title: "เจ้าของธุรกิจ SME",
                      desc: "เห็นภาพการเงินจริงของธุรกิจโดยไม่ต้องจ้างนักบัญชี รู้ทันก่อนเงินสดจะหมด และตัดสินใจได้จากตัวเลขที่ตรวจสอบย้อนกลับไปยังรายการจริงได้เสมอ",
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

              {/* Development status */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  สถานะการพัฒนา
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DEV_STATUS.map((item) => (
                    <div
                      key={item.title}
                      className={`p-4 bg-gray-50 dark:bg-gray-800 border-l-4 ${item.accent} rounded-r-xl rounded-l-sm`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5 flex items-center gap-2">
                        {item.icon}
                        {item.title}
                      </p>
                      <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {item.bullets.map((b, i) => (
                          <li key={i} className="flex gap-2">
                            <span className={`flex-shrink-0 ${item.arrow}`}>→</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
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
                    "Civic Layer เก็บข้อมูลแบบ dual-storage — ไฟล์ JSON ต้นทางโหลดเข้า Postgres สำหรับค้นหา/กรอง/แบ่งหน้า และสร้าง in-memory cache สำหรับอ่านแบบ aggregate ที่ /explore",
                    "การพยากรณ์ใช้ค่าเฉลี่ยถ่วงน้ำหนัก + ดัชนีฤดูกาล ไม่ใช่ AI/ML — บอกตรงๆ เพื่อสร้างความเชื่อมั่น ไม่ใช่คำแนะนำการลงทุน",
                    "ผู้ช่วย AI ตอบจากข้อมูลสรุปที่ผ่านการตรวจสอบแล้วเท่านั้น (ไม่แตะรายการดิบ) ด้วย rule-based engine ที่ไม่มีค่าใช้จ่ายต่อคำถาม",
                    "Rate limiting อยู่ที่ Edge middleware เป็นขั้นแรกของทุก request ก่อน decode JWT หรือ query ฐานข้อมูลใดๆ",
                    "JWT เก็บใน httpOnly cookie แทน localStorage — ป้องกัน XSS",
                    "PostgreSQL (Neon) ใช้ทั้ง dev และ production ผ่าน Prisma เดียวกัน — ลดความต่างระหว่าง environment",
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
