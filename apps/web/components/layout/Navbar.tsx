"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full flex justify-between items-center px-8 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b z-50">
      <Link href="/" className="text-xl font-bold text-[#7F77DD]">
        อุรัณ รัษฎร
      </Link>
      <div className="flex items-center gap-6">
        <Link href="/features" className="text-sm hover:text-[#7F77DD] transition-colors">
          ฟีเจอร์
        </Link>
        <Link href="/pricing" className="text-sm hover:text-[#7F77DD] transition-colors">
          ราคา
        </Link>
        <Link href="/demo" className="text-sm hover:text-[#7F77DD] transition-colors">
          ทดลองใช้
        </Link>
        <Link
          href="/login"
          className="text-sm px-4 py-2 border border-[#7F77DD] text-[#7F77DD] rounded-md hover:bg-purple-50 transition-colors"
        >
          เข้าสู่ระบบ
        </Link>
        <Link
          href="/register"
          className="text-sm px-4 py-2 bg-[#7F77DD] text-white rounded-md hover:bg-[#534AB7] transition-colors"
        >
          สมัครฟรี
        </Link>
      </div>
    </nav>
  );
}
