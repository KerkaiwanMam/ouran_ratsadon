import { CheckCircle2, Wrench, Rocket, Compass } from "lucide-react";

const STATUS_CARDS = [
  {
    icon: <CheckCircle2 size={20} className="text-[#1D9E75]" />,
    accent: "border-l-[#1D9E75]",
    arrow: "text-[#1D9E75]",
    badge: "bg-emerald-100 text-[#1D9E75]",
    title: "ทำเสร็จแล้ว",
    badgeLabel: "Phase 0-3",
    bullets: [
      "Civic Layer: /explore, /search, /project/[id], Red Flag 4 ข้อ, /fiscal-overview, เปรียบเทียบปี",
      "Business Layer: อัปโหลด (Excel/bank statement/accounting export), แดชบอร์ด, วิเคราะห์เชิงลึก 4 ระดับ",
      "Leak detection ครบ 4 กฎ (Outlier, Monthly Spike, Duplicate Payment, Recurring Cost Creep)",
      "ผู้ช่วย AI แบบ rule-based (ไม่มีค่าใช้จ่าย) — เปลี่ยนจาก Anthropic API แล้ว",
      "Security audit: rate limiting (Edge), file sanitization, version race fix, orphan cleanup cron",
      "Stripe + trial 14 วัน, PDF export, alerts (email + LINE), team workspace, API keys",
    ],
  },
  {
    icon: <Wrench size={20} className="text-[#BA7517]" />,
    accent: "border-l-[#EF9F27]",
    arrow: "text-[#BA7517]",
    badge: "bg-amber-100 text-[#BA7517]",
    title: "กำลังพัฒนา",
    badgeLabel: "Ongoing",
    bullets: [
      "ขัดเกลาประสบการณ์ใช้งานของ Business Layer ตามโมเดล 3 ชั้น (Narrative → Evidence → Shared Truth)",
      "เพิ่มบทสรุปภาษาคนและลิงก์ตรวจสอบที่มาของตัวเลขให้ครบทุกหน้า",
      "เก็บข้อมูลใช้งานจริงเพื่อปรับกฎตรวจจับความผิดปกติให้แม่นยำขึ้น",
      "ทยอยเพิ่มภาพหน้าจอและ live demo link ใน README ก่อน deploy จริง",
    ],
  },
  {
    icon: <Rocket size={20} className="text-[#7F77DD]" />,
    accent: "border-l-[#7F77DD]",
    arrow: "text-[#7F77DD]",
    badge: "bg-purple-100 text-[#7F77DD]",
    title: "วางแผนต่อไป — เฟส 1",
    badgeLabel: "Next",
    bullets: [
      "เชื่อมต่อโมเดลภาษาแบบ free-tier (เช่น Google Gemini) ให้ผู้ช่วย AI ตอบคำถามแบบอิสระ",
      "ยังอ้างอิงข้อมูลที่ผ่านการตรวจสอบแล้วเหมือนเดิม ไม่เปิดให้โมเดลเข้าถึงข้อมูลดิบ",
      "รองรับ streaming response และเก็บประวัติแชท (ChatMessage model)",
      "deploy ขึ้น Vercel + Railway/Render พร้อม live demo จริง",
    ],
  },
  {
    icon: <Compass size={20} className="text-[#534AB7]" />,
    accent: "border-l-[#534AB7]",
    arrow: "text-[#534AB7]",
    badge: "bg-indigo-100 text-[#534AB7]",
    title: "วางแผนต่อไป — เฟส 2",
    badgeLabel: "Later",
    bullets: [
      "ขยาย Fiscal Intelligence ไปถึงระดับผู้รับเหมา/คู่สัญญาภาครัฐ",
      "Red Flag รายผู้รับเหมา — ความเข้มข้น (concentration) และผู้รับเหมาที่ถูกตั้งข้อสังเกตซ้ำ",
      "โปรไฟล์บริษัท (/recipient/[id]) เชื่อมข้อมูลจัดซื้อจัดจ้าง (e-GP) กับงบประมาณ และข้อมูลงบการเงิน (SET)",
      "Vendor/counterparty pattern detection (Pro) — กลุ่มผู้ให้บริการแบบ fuzzy-matched",
    ],
  },
];

export default function AdminRoadmapPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Roadmap &amp; Plan</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        ภาพรวมสถานะการพัฒนาแพลตฟอร์ม — ดูเฉพาะผู้ดูแลระบบ
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STATUS_CARDS.map((item) => (
          <div
            key={item.title}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-l-4 ${item.accent} p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {item.icon}
                {item.title}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.badge}`}>
                {item.badgeLabel}
              </span>
            </div>
            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
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
  );
}
