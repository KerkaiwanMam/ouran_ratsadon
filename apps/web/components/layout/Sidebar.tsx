"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  role?: "member" | "admin";
}

const memberLinks = [
  { href: "/dashboard", label: "แดชบอร์ด" },
  { href: "/upload", label: "อัปโหลดไฟล์" },
  { href: "/files", label: "ไฟล์ของฉัน" },
  { href: "/compare", label: "เปรียบเทียบ" },
  { href: "/settings/profile", label: "ตั้งค่า" },
  { href: "/upgrade", label: "อัปเกรด Pro" },
];

const adminLinks = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/users", label: "ผู้ใช้งาน" },
  { href: "/admin/files", label: "ไฟล์ทั้งหมด" },
  { href: "/admin/subscriptions", label: "การสมัครสมาชิก" },
  { href: "/admin/logs", label: "บันทึกระบบ" },
];

export default function Sidebar({ role = "member" }: SidebarProps) {
  const pathname = usePathname();
  const links = role === "admin" ? adminLinks : memberLinks;

  return (
    <aside className="fixed left-0 top-0 h-full w-[200px] bg-white dark:bg-gray-900 border-r flex flex-col py-6 px-4 z-40">
      <Link href="/" className="text-lg font-bold text-[#7F77DD] mb-8 px-2">
        อุรัณ รัษฎร
      </Link>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2 rounded-md text-sm transition-colors ${
              pathname === link.href
                ? "bg-purple-50 text-[#7F77DD] font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
