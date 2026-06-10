"use client";

import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface Props {
  items: BreadcrumbItem[];
  totalBudget?: number;
}

export default function BreadcrumbNav({ items, totalBudget }: Props) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <nav className="flex items-center flex-wrap gap-1 text-sm">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
            )}
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className="px-2 py-1 rounded-md bg-purple-50 text-[#7F77DD] hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40 font-medium transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      {totalBudget !== undefined && (
        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
          รวม{" "}
          <span className="font-bold text-gray-900 dark:text-gray-100">
            ฿{(totalBudget / 1e9).toFixed(1)} พันล้าน
          </span>
        </span>
      )}
    </div>
  );
}
