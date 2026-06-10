"use client";

import { useState } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import type { MinistryListItem, BudgetType } from "@/types/civic";

interface FilterState {
  ministries: string[];
  budgetTypes: BudgetType[];
  status: string[];
  minAmount: string;
  maxAmount: string;
}

interface Props {
  ministryList: MinistryListItem[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const BUDGET_TYPES: { value: BudgetType; label: string }[] = [
  { value: "personnel", label: "บุคลากร" },
  { value: "operating", label: "ดำเนินงาน" },
  { value: "investment", label: "ลงทุน" },
  { value: "other", label: "อื่นๆ" },
];

const STATUS_OPTIONS = [
  { value: "red_flag", label: "มีธงแดง" },
  { value: "increased_50", label: "เพิ่มขึ้น >50%" },
  { value: "duplicate", label: "อาจซ้ำซ้อน" },
];

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 py-3 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between mb-2 cursor-pointer group"
        aria-expanded={open}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-1.5 text-[10px] bg-[#7F77DD] text-white px-1.5 py-0.5 rounded-full font-bold">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          size={13}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && children}
    </div>
  );
}

function CheckItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group py-1 select-none">
      <span
        className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors duration-150 ${
          checked
            ? "bg-[#7F77DD] border-[#7F77DD]"
            : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 group-hover:border-[#7F77DD]"
        }`}
        aria-hidden="true"
      >
        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`text-sm transition-colors duration-150 ${
          checked
            ? "text-[#7F77DD] font-medium"
            : "text-gray-700 dark:text-gray-300 group-hover:text-[#7F77DD]"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

export default function FilterPanel({ ministryList, filters, onChange }: Props) {
  function toggleMinistry(id: string) {
    const next = filters.ministries.includes(id)
      ? filters.ministries.filter((m) => m !== id)
      : [...filters.ministries, id];
    onChange({ ...filters, ministries: next });
  }

  function toggleBudgetType(type: BudgetType) {
    const next = filters.budgetTypes.includes(type)
      ? filters.budgetTypes.filter((t) => t !== type)
      : [...filters.budgetTypes, type];
    onChange({ ...filters, budgetTypes: next });
  }

  function toggleStatus(s: string) {
    const next = filters.status.includes(s)
      ? filters.status.filter((x) => x !== s)
      : [...filters.status, s];
    onChange({ ...filters, status: next });
  }

  function clearAll() {
    onChange({ ministries: [], budgetTypes: [], status: [], minAmount: "", maxAmount: "" });
  }

  const activeCount =
    filters.ministries.length +
    filters.budgetTypes.length +
    filters.status.length +
    (filters.minAmount ? 1 : 0) +
    (filters.maxAmount ? 1 : 0);

  return (
    <div className="w-full">
      {/* Active filter summary bar */}
      {activeCount > 0 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-medium text-[#7F77DD]">
            {activeCount} ตัวกรองที่เลือก
          </span>
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            <X size={11} aria-hidden="true" />
            ล้างทั้งหมด
          </button>
        </div>
      )}

      <Section title="กระทรวง" count={filters.ministries.length}>
        <div className="max-h-52 overflow-y-auto flex flex-col gap-0 pr-1 scrollbar-thin">
          {ministryList.map((m) => (
            <CheckItem
              key={m.id}
              label={`${m.name.replace("กระทรวง", "กต.")} (${(m.budget / 1e9).toFixed(0)}B)`}
              checked={filters.ministries.includes(m.id)}
              onChange={() => toggleMinistry(m.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="ประเภทงบ" count={filters.budgetTypes.length}>
        <div className="flex flex-col gap-0">
          {BUDGET_TYPES.map((bt) => (
            <CheckItem
              key={bt.value}
              label={bt.label}
              checked={filters.budgetTypes.includes(bt.value)}
              onChange={() => toggleBudgetType(bt.value)}
            />
          ))}
        </div>
      </Section>

      <Section title="สถานะ" count={filters.status.length}>
        <div className="flex flex-col gap-0">
          {STATUS_OPTIONS.map((s) => (
            <CheckItem
              key={s.value}
              label={s.label}
              checked={filters.status.includes(s.value)}
              onChange={() => toggleStatus(s.value)}
            />
          ))}
        </div>
      </Section>

      <Section title="วงเงิน">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">฿</span>
            <input
              type="number"
              placeholder="ขั้นต่ำ"
              value={filters.minAmount}
              onChange={(e) => onChange({ ...filters, minAmount: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/30 focus:border-[#7F77DD] dark:bg-gray-900 dark:text-gray-200 transition-colors"
            />
          </div>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">฿</span>
            <input
              type="number"
              placeholder="สูงสุด"
              value={filters.maxAmount}
              onChange={(e) => onChange({ ...filters, maxAmount: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/30 focus:border-[#7F77DD] dark:bg-gray-900 dark:text-gray-200 transition-colors"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

export type { FilterState };
