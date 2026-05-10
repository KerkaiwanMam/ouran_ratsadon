// components/Navbar.tsx
"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full flex justify-between items-center px-8 py-4 bg-black/50 backdrop-blur-lg z-50">
      <div className="text-xl font-bold">Political Digest</div>
      <div>
        <Link href="/knowledge" className="glass">
          ความรู้ทางการเมือง
        </Link>
      </div>
    </nav>
  );
}
