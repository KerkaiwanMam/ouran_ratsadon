"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, LogOut, User, Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const NAV_LINKS = [
  { href: "/explore", label: "งบประมาณรัฐ" },
  { href: "/search", label: "ค้นหา" },
  { href: "/pricing", label: "ราคา" },
  { href: "/about", label: "เกี่ยวกับ" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, mutate } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const civicActive =
    pathname.startsWith("/explore") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/project") ||
    pathname.startsWith("/ministry");

  function isActive(href: string) {
    if (href === "/explore") return civicActive;
    return pathname === href;
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    mutate();
    window.location.href = "/";
  }

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* Skip to content (accessibility) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#7F77DD] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        ข้ามไปเนื้อหาหลัก
      </a>

      <nav className="fixed top-0 w-full flex justify-between items-center px-5 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200/80 dark:border-gray-700/60 z-50 transition-colors duration-200">
        {/* Logo */}
        <Link
          href="/"
          className="text-base font-bold text-[#7F77DD] flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
        >
          <BarChart3 size={20} aria-hidden="true" />
          <span>อุรัณ รัษฎร</span>
        </Link>

        {/* Desktop center nav */}
        <div className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                isActive(link.href)
                  ? "bg-purple-50 dark:bg-purple-900/30 text-[#7F77DD]"
                  : "text-gray-600 dark:text-gray-400 hover:text-[#7F77DD] hover:bg-purple-50/60 dark:hover:bg-purple-900/20"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side: auth + mobile toggle */}
        <div className="flex items-center gap-2">
          {/* Auth area (desktop) */}
          <div className="hidden sm:flex items-center gap-2">
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 cursor-pointer"
                >
                  <User size={14} className="text-gray-500" aria-hidden="true" />
                  <span className="max-w-[100px] truncate text-gray-700 dark:text-gray-300 font-medium">
                    {user.name}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-gray-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 py-1.5 z-50">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      แดชบอร์ด
                    </Link>
                    <Link
                      href="/settings/profile"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      ตั้งค่า
                    </Link>
                    <hr className="my-1 border-gray-100 dark:border-gray-800" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors cursor-pointer"
                    >
                      <LogOut size={13} aria-hidden="true" />
                      ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 font-medium"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  className="text-sm px-3 py-1.5 bg-[#7F77DD] text-white rounded-lg hover:bg-[#534AB7] transition-colors duration-150 font-medium"
                >
                  สมัครฟรี
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={mobileOpen}
            className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 cursor-pointer"
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-72 max-w-[85vw] z-50 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="เมนูหลัก"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <Link
            href="/"
            className="text-base font-bold text-[#7F77DD] flex items-center gap-2"
          >
            <BarChart3 size={18} aria-hidden="true" />
            อุรัณ รัษฎร
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="ปิดเมนู"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Drawer nav links */}
        <nav className="px-3 py-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive(link.href)
                  ? "bg-purple-50 dark:bg-purple-900/30 text-[#7F77DD]"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Drawer auth */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-5 border-t border-gray-100 dark:border-gray-800 space-y-2">
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                <User size={16} className="text-gray-400" aria-hidden="true" />
                <span className="truncate font-medium">{user.name}</span>
              </div>
              <Link
                href="/dashboard"
                className="block w-full text-center px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                แดชบอร์ด
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors cursor-pointer"
              >
                <LogOut size={14} aria-hidden="true" />
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="block w-full text-center px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/register"
                className="block w-full text-center px-4 py-2.5 rounded-lg bg-[#7F77DD] text-sm font-medium text-white hover:bg-[#534AB7] transition-colors"
              >
                สมัครฟรี
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
