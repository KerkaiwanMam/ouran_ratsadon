"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import {
  BarChart3,
  LineChart,
  LayoutDashboard,
  Upload,
  FolderOpen,
  GitCompare,
  Settings,
  Zap,
  Users,
  Files,
  CreditCard,
  ScrollText,
  Database,
  Receipt,
  Bell,
  Sparkles,
  Map,
  ClipboardCheck,
} from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SidebarProps {
  role?: "member" | "admin";
}

const memberLinks = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/transactions", label: "รายการธุรกรรม", icon: Receipt },
  { href: "/analytics", label: "วิเคราะห์เชิงลึก", icon: LineChart },
  { href: "/action-items", label: "สิ่งที่ต้องตรวจสอบ", icon: ClipboardCheck },
  { href: "/vendors", label: "ผู้ให้บริการ", icon: Users, pro: true },
  { href: "/assistant", label: "ผู้ช่วย AI", icon: Sparkles, pro: true },
  { href: "/upload", label: "อัปโหลดไฟล์", icon: Upload },
  { href: "/files", label: "ไฟล์ของฉัน", icon: FolderOpen },
  { href: "/files/compare", label: "เปรียบเทียบ", icon: GitCompare },
  { href: "/settings/profile", label: "ตั้งค่า", icon: Settings },
  { href: "/upgrade", label: "อัปเกรด Pro", icon: Zap },
];

const adminLinks = [
  { href: "/admin", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/admin/users", label: "ผู้ใช้งาน", icon: Users },
  { href: "/admin/files", label: "ไฟล์ทั้งหมด", icon: Files },
  { href: "/admin/subscriptions", label: "การสมัครสมาชิก", icon: CreditCard },
  { href: "/admin/civic-data", label: "ชุดข้อมูลงบ", icon: Database },
  { href: "/admin/logs", label: "บันทึกระบบ", icon: ScrollText },
  { href: "/admin/roadmap", label: "Roadmap & Plan", icon: Map },
];

export default function Sidebar({ role = "member" }: SidebarProps) {
  const pathname = usePathname();
  const links = role === "admin" ? adminLinks : memberLinks;

  const { data: alertsData } = useSWR<{ unreadCount: number }>(
    role === "member" ? "/api/business/alerts" : null,
    fetcher,
    { refreshInterval: 30000 }
  );
  const unreadCount = alertsData?.unreadCount ?? 0;

  return (
    <aside className="fixed left-0 top-0 h-full w-[200px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col py-5 px-3 z-40">
      {/* Logo + notifications */}
      <div className="flex items-center justify-between gap-2 px-2 mb-7">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-bold text-[#7F77DD] hover:opacity-80 transition-opacity"
        >
          <BarChart3 size={18} aria-hidden="true" />
          <span>อุรัณ รัษฎร</span>
        </Link>
        {role === "member" && (
          <Link
            href="/settings/notifications"
            aria-label={unreadCount > 0 ? `การแจ้งเตือน (${unreadCount} ใหม่)` : "การแจ้งเตือน"}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-[#7F77DD] transition-colors"
          >
            <Bell size={17} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 flex-1" aria-label="เมนูหลัก">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          const isUpgrade = link.href === "/upgrade";

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isUpgrade
                  ? "mt-auto border border-[#7F77DD]/25 bg-gradient-to-r from-[#7F77DD]/12 to-[#534AB7]/12 text-[#7F77DD] hover:from-[#7F77DD]/20 hover:to-[#534AB7]/20 hover:border-[#7F77DD]/40"
                  : active
                  ? "bg-purple-50 dark:bg-purple-900/25 text-[#7F77DD] shadow-[inset_0_0_0_1px_rgba(127,119,221,0.18)]"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={17}
                aria-hidden="true"
                className={`shrink-0 ${active || isUpgrade ? "text-[#7F77DD]" : "text-gray-400 dark:text-gray-500"}`}
              />
              <span className="truncate">{link.label}</span>
              {(isUpgrade || "pro" in link) && (
                <span className="ml-auto text-[10px] font-bold bg-[#7F77DD] text-white px-1.5 py-0.5 rounded-full leading-none shrink-0">
                  PRO
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme switcher + role label */}
      <div className="px-3 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
          {role === "admin" ? "ผู้ดูแลระบบ" : "สมาชิก"}
        </p>
        <ThemeToggle />
      </div>
    </aside>
  );
}
