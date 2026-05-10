// components/HeroSection.tsx
"use client";
import GlassButton from "./GlassButton";

export default function HeroSection() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-screen px-4">
      <h1 className="text-4xl md:text-6xl font-bold mb-8">
        เลือกติดตามข่าวการเมือง
      </h1>
      <div className="flex flex-col md:flex-row gap-4">
        <GlassButton text="ส.ส. เขต" href="/district" />
        <GlassButton text="ส.ส. บัญชีรายชื่อ" href="/party" />
        <GlassButton text="ความรู้ทางการเมือง" href="/knowledge" />
      </div>
      <p className="mt-6 text-gray-300 max-w-xl">
        เว็บไซต์นี้รวบรวมข่าวการเมืองให้อ่านง่าย เหมาะสำหรับทุกคน
      </p>
    </div>
  );
}
