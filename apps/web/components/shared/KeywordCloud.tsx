"use client";

import { Tag } from "lucide-react";
import type { KeywordCount } from "@/lib/keywords";

export default function KeywordCloud({
  keywords,
  onSelect,
  emptyMessage = "ไม่พบคีย์เวิร์ดที่พบบ่อยในผลลัพธ์ปัจจุบัน",
  hint = 'คลิกคีย์เวิร์ดเพื่อกรองรายการที่เกี่ยวข้อง',
}: {
  keywords: KeywordCount[];
  onSelect: (keyword: string) => void;
  emptyMessage?: string;
  hint?: string;
}) {
  if (keywords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Tag size={28} className="mb-2 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const maxCount = keywords[0]?.count ?? 1;

  return (
    <div className="p-4">
      <p className="text-xs text-gray-400 mb-3">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {keywords.map((k) => {
          const ratio = maxCount > 1 ? k.count / maxCount : 1;
          const fontSize = 12 + ratio * 8; // 12px - 20px

          return (
            <button
              key={k.keyword}
              onClick={() => onSelect(k.keyword)}
              style={{ fontSize: `${fontSize}px` }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-[#534AB7] dark:text-[#c4c0f7] font-medium hover:bg-[#7F77DD] hover:text-white hover:border-[#7F77DD] transition-colors duration-200 cursor-pointer"
              title={`คลิกเพื่อกรองด้วยคำว่า "${k.keyword}"`}
            >
              {k.keyword}
              <span className="text-xs leading-none rounded-full bg-white/60 dark:bg-black/30 px-1.5 py-0.5">
                {k.count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
