import Link from "next/link";
import { BarChart3, Github } from "lucide-react";

const FOOTER_LINKS = [
  {
    heading: "แพลตฟอร์ม",
    links: [
      { href: "/explore", label: "งบประมาณรัฐ" },
      { href: "/search", label: "ค้นหาโครงการ" },
      { href: "/pricing", label: "แผนราคา" },
    ],
  },
  {
    heading: "บริษัท",
    links: [
      { href: "/about", label: "เกี่ยวกับเรา" },
      { href: "/contact", label: "ติดต่อ" },
    ],
  },
  {
    heading: "กฎหมาย",
    links: [
      { href: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
      { href: "/terms", label: "ข้อกำหนดการใช้งาน" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-base font-bold text-[#7F77DD] mb-3 hover:opacity-80 transition-opacity"
            >
              <BarChart3 size={18} aria-hidden="true" />
              อุรัณ รัษฎร
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              แพลตฟอร์มวิเคราะห์งบประมาณอัจฉริยะ — ภาครัฐโปร่งใส, SME เข้มแข็ง
            </p>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <Github size={14} aria-hidden="true" />
              Open Source
            </a>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                {col.heading}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © 2025 อุรัณ รัษฎร — Budget Intelligence Platform
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            ข้อมูลงบประมาณจาก{" "}
            <a
              href="https://bb.go.th"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              สำนักงบประมาณ (bb.go.th)
            </a>{" "}
            — เป็นข้อมูลสาธารณะ
          </p>
        </div>
      </div>
    </footer>
  );
}
