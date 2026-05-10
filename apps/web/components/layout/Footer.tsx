import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t py-8 px-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-gray-500">
          © 2025 อุรัณ รัษฎร — Budget Intelligence Platform
        </p>
        <div className="flex gap-4 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-gray-800">
            นโยบายความเป็นส่วนตัว
          </Link>
          <Link href="/terms" className="hover:text-gray-800">
            ข้อกำหนดการใช้งาน
          </Link>
          <Link href="/contact" className="hover:text-gray-800">
            ติดต่อ
          </Link>
        </div>
      </div>
    </footer>
  );
}
