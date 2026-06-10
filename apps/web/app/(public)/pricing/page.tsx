import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Check, X } from "lucide-react";

const PLANS = [
  {
    name: "Civic Explorer",
    price: "ฟรี",
    priceNote: "ไม่ต้อง login",
    color: "border-gray-200 dark:border-gray-700",
    highlight: false,
    ctaText: "เปิด Explorer",
    ctaHref: "/explore",
    features: [
      { label: "ดูงบประมาณแผ่นดินทุกปี", yes: true },
      { label: "Treemap + ตาราง Interactive", yes: true },
      { label: "Red Flag Detection", yes: true },
      { label: "ค้นหาขั้นสูงพร้อม Filter", yes: true },
      { label: "ดาวน์โหลด CSV / JSON", yes: true },
      { label: "ไม่ต้องสมัครสมาชิก", yes: true },
    ],
  },
  {
    name: "SME Free",
    price: "ฟรี",
    priceNote: "ต้อง login",
    color: "border-gray-200 dark:border-gray-700",
    highlight: false,
    ctaText: "สมัครฟรี",
    ctaHref: "/register",
    features: [
      { label: "อัปโหลด 3 ไฟล์/เดือน", yes: true },
      { label: "Cash Flow Dashboard", yes: true },
      { label: "Auto-categorize", yes: true },
      { label: "Export CSV", yes: true },
      { label: "Leak Detection", yes: false },
      { label: "Cash Flow Forecast", yes: false },
    ],
  },
  {
    name: "SME Pro",
    price: "฿299",
    priceNote: "/เดือน (หรือ ฿2,999/ปี)",
    color: "border-[#7F77DD]",
    highlight: true,
    badge: "แนะนำ",
    ctaText: "เริ่ม 14 วันฟรี",
    ctaHref: "/register",
    features: [
      { label: "อัปโหลดไม่จำกัด", yes: true },
      { label: "Cash Flow Dashboard", yes: true },
      { label: "Auto-categorize", yes: true },
      { label: "Export CSV + PDF", yes: true },
      { label: "Leak Detection (4 กฎ)", yes: true },
      { label: "Cash Flow Forecast", yes: true },
      { label: "What-If Scenarios", yes: true },
      { label: "Alerts (Email)", yes: true },
    ],
  },
  {
    name: "SME Team",
    price: "฿799",
    priceNote: "/เดือน",
    color: "border-gray-200 dark:border-gray-700",
    highlight: false,
    ctaText: "ติดต่อ",
    ctaHref: "/contact",
    features: [
      { label: "ทุกอย่างใน Pro", yes: true },
      { label: "5 ผู้ใช้/workspace", yes: true },
      { label: "Shared dashboards", yes: true },
      { label: "Comments & annotations", yes: true },
      { label: "Alerts (Email + LINE)", yes: true },
      { label: "Role-based access", yes: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="py-16 text-center bg-white dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              แผนราคา
            </h1>
            <p className="text-gray-500 max-w-xl mx-auto">
              เริ่มจาก Civic Layer ฟรีสมบูรณ์ — อัปเกรดเมื่อต้องการวิเคราะห์ธุรกิจ
            </p>
          </div>
        </section>

        <section className="pb-16 bg-white dark:bg-gray-900">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative border-2 rounded-2xl p-5 flex flex-col ${plan.color} ${
                    plan.highlight ? "shadow-lg shadow-purple-100 dark:shadow-purple-900/20" : ""
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#7F77DD] text-white text-xs font-bold rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <div className="mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">
                      {plan.name}
                    </h3>
                    <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
                      {plan.price}
                    </p>
                    <p className="text-xs text-gray-500">{plan.priceNote}</p>
                  </div>

                  <ul className="space-y-2 flex-1 mb-5">
                    {plan.features.map((f) => (
                      <li key={f.label} className="flex items-start gap-2 text-sm">
                        {f.yes ? (
                          <Check size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X size={14} className="text-gray-300 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={f.yes ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.ctaHref}
                    className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                      plan.highlight
                        ? "bg-[#7F77DD] text-white hover:bg-[#534AB7]"
                        : "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {plan.ctaText}
                  </Link>
                </div>
              ))}
            </div>

            {/* FAQ */}
            <div className="mt-14 max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
                คำถามที่พบบ่อย
              </h2>
              <div className="space-y-4">
                {[
                  {
                    q: "Civic Layer ฟรีจริงหรือ?",
                    a: "ใช่ — ฟรีสมบูรณ์ ไม่ต้อง login ไม่จำกัดการใช้งาน ข้อมูลงบประมาณรัฐเป็น Open Data",
                  },
                  {
                    q: "การพยากรณ์ Cash Flow ใช้ AI ไหม?",
                    a: "ไม่ — เราใช้ค่าเฉลี่ยถ่วงน้ำหนัก (Weighted Moving Average) และบอกตรงๆ ว่าไม่ใช่ AI เพื่อความโปร่งใส",
                  },
                  {
                    q: "ข้อมูลของฉันปลอดภัยไหม?",
                    a: "ข้อมูลธุรกิจของคุณเป็นของคุณเท่านั้น ไม่แชร์กับบุคคลที่สาม และสามารถลบได้ทุกเมื่อ",
                  },
                  {
                    q: "รองรับ Bank Statement ธนาคารอะไรบ้าง?",
                    a: "Phase 0 รองรับ Excel Template ของเรา (ดาวน์โหลดได้ฟรี) รองรับ SCB/KBANK/BBL ใน Phase 1",
                  },
                ].map((faq) => (
                  <div
                    key={faq.q}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                  >
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                      {faq.q}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
