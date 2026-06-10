"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { Search, X, SlidersHorizontal, ArrowUpDown, Download, Bookmark, BookmarkPlus, Trash2, Check } from "lucide-react";
import FilterPanel, { type FilterState } from "@/components/civic/FilterPanel";
import RedFlagBadge from "@/components/civic/RedFlagBadge";
import StatStrip from "@/components/civic/StatStrip";
import type { SearchResult, MinistryListItem, BudgetType } from "@/types/civic";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SORT_OPTIONS = [
  { value: "amount_desc", label: "วงเงินมากสุด" },
  { value: "amount_asc", label: "วงเงินน้อยสุด" },
  { value: "change_desc", label: "เพิ่มขึ้นมากสุด" },
  { value: "name_asc", label: "ชื่อ ก-ฮ" },
];

const BUDGET_TYPE_LABELS: Record<string, string> = {
  personnel: "บุคลากร",
  operating: "ดำเนินงาน",
  investment: "ลงทุน",
  other: "อื่นๆ",
};

const BUDGET_TYPE_COLORS: Record<string, string> = {
  personnel: "#7F77DD",
  operating: "#34D399",
  investment: "#FBBF24",
  other: "#9CA3AF",
};

export default function SearchPage() {
  // Read initial values from URL so links like /search?year=2569&q=... work
  const urlParams = useSearchParams();

  // Years list comes from /api/civic/years (backed by getAvailableYears(),
  // which scans the data/ directory) instead of a hardcoded "2568" — that
  // hid newly-uploaded fiscal years (e.g. 2569) from search entirely.
  const { data: yearsData } = useSWR<{ years: string[]; current: string }>(
    "/api/civic/years",
    fetcher
  );
  const availableYears = yearsData?.years ?? [];
  const [year, setYear] = useState(() => urlParams.get("year") ?? "2568");
  const [yearInitialized, setYearInitialized] = useState(() => !!urlParams.get("year"));

  // Once the real list of years arrives, default to the latest one (only the
  // first time — don't clobber a year the user has since picked themselves).
  useEffect(() => {
    if (!yearInitialized && yearsData?.current) {
      setYear(yearsData.current);
      setYearInitialized(true);
    }
  }, [yearInitialized, yearsData]);
  const [q, setQ] = useState(() => urlParams.get("q") ?? "");
  const [sort, setSort] = useState("amount_desc");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    ministries: [],
    budgetTypes: [],
    // Pre-populate status filter from URL (e.g. ?status=red_flag from ministry page)
    status: urlParams.get("status") ? [urlParams.get("status")!] : [],
    minAmount: "",
    maxAmount: "",
  });

  // ── Saved searches ─────────────────────────────────────────────────────────
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const savedPanelRef = useRef<HTMLDivElement>(null);

  interface SavedSearchItem {
    id: string;
    label: string;
    filters: Record<string, unknown>;
    resultCount?: number | null;
    createdAt: string;
  }

  const savedSearchFetcher = (url: string) =>
    fetch(url).then((r) => (r.status === 401 ? null : r.json()));
  const { data: savedData, mutate: mutateSaved } = useSWR<{ searches: SavedSearchItem[] } | null>(
    "/api/civic/saved-searches",
    savedSearchFetcher
  );
  const savedSearches = savedData?.searches ?? [];

  // Close panel on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (savedPanelRef.current && !savedPanelRef.current.contains(e.target as Node)) {
        setShowSavedPanel(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSaveSearch() {
    const label = saveLabel.trim() || `ค้นหา "${q || "ทั้งหมด"}" พ.ศ.${year}`;
    setSaving(true);
    try {
      const res = await fetch("/api/civic/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          filters: { q, year, ...filters },
          resultCount: results?.total ?? null,
        }),
      });
      if (res.ok) {
        mutateSaved();
        setSaveLabel("");
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleLoadSearch(item: SavedSearchItem) {
    const f = item.filters as {
      q?: string; year?: string;
      ministries?: string[]; budgetTypes?: string[];
      status?: string[]; minAmount?: string; maxAmount?: string;
    };
    if (f.q !== undefined) setQ(f.q);
    if (f.year) { setYear(f.year); setYearInitialized(true); }
    setFilters({
      ministries: f.ministries ?? [],
      // Saved filters come from JSON — validate instead of blind-casting.
      budgetTypes: (f.budgetTypes ?? []).filter((v): v is BudgetType =>
        ["personnel", "operating", "investment", "other"].includes(v)
      ),
      status: f.status ?? [],
      minAmount: f.minAmount ?? "",
      maxAmount: f.maxAmount ?? "",
    });
    setPage(1);
    setShowSavedPanel(false);
  }

  async function handleDeleteSearch(id: string) {
    await fetch(`/api/civic/saved-searches?id=${id}`, { method: "DELETE" });
    mutateSaved();
  }

  // Fetch ministry list for filter panel
  const { data: budgetData } = useSWR<{
    ministries: MinistryListItem[];
    totalBudget: number;
    projectCount: number;
    redFlagCount: number;
  }>(`/api/civic/budget/${year}`, fetcher);

  // Build search URL
  const buildUrl = useCallback(() => {
    const p = new URLSearchParams();
    p.set("year", year);
    if (q) p.set("q", q);
    p.set("sort", sort);
    p.set("page", String(page));
    p.set("limit", "20");
    filters.ministries.forEach((m) => p.append("ministries[]", m));
    filters.budgetTypes.forEach((t) => p.append("budgetTypes[]", t));
    filters.status.forEach((s) => p.append("status[]", s));
    if (filters.minAmount) p.set("minAmount", filters.minAmount);
    if (filters.maxAmount) p.set("maxAmount", filters.maxAmount);
    return `/api/civic/search?${p}`;
  }, [year, q, sort, page, filters]);

  // Same filters as the search query, minus pagination — downloads the full
  // filtered result set (not just the current page) as CSV.
  const buildExportUrl = useCallback(() => {
    const p = new URLSearchParams();
    p.set("year", year);
    if (q) p.set("q", q);
    p.set("sort", sort);
    filters.ministries.forEach((m) => p.append("ministries[]", m));
    filters.budgetTypes.forEach((t) => p.append("budgetTypes[]", t));
    filters.status.forEach((s) => p.append("status[]", s));
    if (filters.minAmount) p.set("minAmount", filters.minAmount);
    if (filters.maxAmount) p.set("maxAmount", filters.maxAmount);
    return `/api/civic/export/csv?${p}`;
  }, [year, q, sort, filters]);

  const { data: results, isLoading } = useSWR<SearchResult>(buildUrl(), fetcher);

  // Reset page on filter change
  useEffect(() => setPage(1), [q, sort, filters]);

  const activeFilterCount =
    filters.ministries.length +
    filters.budgetTypes.length +
    filters.status.length +
    (filters.minAmount ? 1 : 0) +
    (filters.maxAmount ? 1 : 0);

  // Active filter tags
  const activeTags: { label: string; remove: () => void }[] = [
    ...filters.ministries.map((id) => ({
      label: budgetData?.ministries.find((m) => m.id === id)?.name ?? id,
      remove: () =>
        setFilters((f) => ({
          ...f,
          ministries: f.ministries.filter((m) => m !== id),
        })),
    })),
    ...filters.budgetTypes.map((bt) => ({
      label: BUDGET_TYPE_LABELS[bt] ?? bt,
      remove: () =>
        setFilters((f) => ({
          ...f,
          budgetTypes: f.budgetTypes.filter((t) => t !== bt),
        })),
    })),
    ...filters.status.map((s) => ({
      label: s === "red_flag" ? "มีธงแดง" : s === "increased_50" ? "เพิ่ม>50%" : s,
      remove: () =>
        setFilters((f) => ({ ...f, status: f.status.filter((x) => x !== s) })),
    })),
    ...(filters.minAmount
      ? [
          {
            label: `≥ ฿${Number(filters.minAmount).toLocaleString()}`,
            remove: () => setFilters((f) => ({ ...f, minAmount: "" })),
          },
        ]
      : []),
    ...(filters.maxAmount
      ? [
          {
            label: `≤ ฿${Number(filters.maxAmount).toLocaleString()}`,
            remove: () => setFilters((f) => ({ ...f, maxAmount: "" })),
          },
        ]
      : []),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Title + search bar */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            ค้นหาโครงการงบประมาณ
          </h1>

          {/* Year selector — list comes from /api/civic/years (getAvailableYears) */}
          {availableYears.length > 0 && (
            <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
              {availableYears.map((y) => (
                <button
                  key={y}
                  onClick={() => {
                    setYear(y);
                    setYearInitialized(true);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    y === year
                      ? "bg-[#7F77DD] text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  พ.ศ. {y}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='ค้นหาด้วยคำหรือประโยค เช่น "วัคซีน กระทรวงสาธารณสุข", "งบบุคลากร", "โครงการที่ถูกตั้งธงแดง"'
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD] transition"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-colors ${
              showFilters
                ? "bg-[#7F77DD] text-white border-[#7F77DD]"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600"
            }`}
          >
            <SlidersHorizontal size={14} />
            ตัวกรอง
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-white/30 text-xs rounded-full px-1.5 py-0.5">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Saved searches trigger */}
          <div className="relative" ref={savedPanelRef}>
            <button
              onClick={() => setShowSavedPanel((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-colors ${
                showSavedPanel
                  ? "bg-[#7F77DD] text-white border-[#7F77DD]"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
              }`}
              title="การค้นหาที่บันทึกไว้"
            >
              <Bookmark size={14} />
              {savedSearches.length > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${showSavedPanel ? "bg-white/30" : "bg-gray-100 dark:bg-gray-700"}`}>
                  {savedSearches.length}
                </span>
              )}
            </button>

            {/* Saved searches dropdown */}
            {showSavedPanel && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden">
                {/* Save current search */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    บันทึกการค้นหาปัจจุบัน
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={saveLabel}
                      onChange={(e) => setSaveLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !saving && handleSaveSearch()}
                      placeholder={`เช่น "วัคซีน สธ. 2568"`}
                      className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
                    />
                    <button
                      onClick={handleSaveSearch}
                      disabled={saving || !savedData}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#7F77DD] text-white text-xs rounded-lg disabled:opacity-50 hover:bg-[#534AB7] transition-colors"
                    >
                      {justSaved ? <Check size={12} /> : <BookmarkPlus size={12} />}
                      {justSaved ? "บันทึกแล้ว" : "บันทึก"}
                    </button>
                  </div>
                  {!savedData && (
                    <p className="text-xs text-amber-500 mt-1.5">
                      กรุณา{" "}
                      <a href="/login" className="underline">
                        เข้าสู่ระบบ
                      </a>{" "}
                      เพื่อบันทึกการค้นหา
                    </p>
                  )}
                </div>

                {/* Saved list */}
                {savedSearches.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-gray-400">
                    ยังไม่มีการค้นหาที่บันทึกไว้
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                    {savedSearches.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 group"
                      >
                        <button
                          className="flex-1 text-left"
                          onClick={() => handleLoadSearch(item)}
                        >
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                            {item.label}
                          </p>
                          {item.resultCount != null && (
                            <p className="text-xs text-gray-400">
                              {item.resultCount.toLocaleString()} โครงการ
                            </p>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteSearch(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active filter tags */}
      {activeTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeTags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-[#7F77DD] text-xs rounded-full border border-purple-200 dark:border-purple-700"
            >
              {tag.label}
              <button onClick={tag.remove} className="hover:text-purple-900">
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            onClick={() =>
              setFilters({
                ministries: [],
                budgetTypes: [],
                status: [],
                minAmount: "",
                maxAmount: "",
              })
            }
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            ล้างทั้งหมด
          </button>
        </div>
      )}

      <div className="flex gap-4">
        {/* Filter sidebar */}
        {showFilters && (
          <aside className="w-56 flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <FilterPanel
                ministryList={budgetData?.ministries ?? []}
                filters={filters}
                onChange={setFilters}
              />
            </div>
          </aside>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Stats + sort */}
          {results && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 mb-3">
              <div className="flex items-center justify-between">
                <StatStrip
                  stats={[
                    {
                      label: "ผลลัพธ์",
                      value: `${results.total.toLocaleString()} โครงการ`,
                    },
                    {
                      label: "วงเงินรวม",
                      value: `฿${(results.stats.totalAmount / 1e9).toFixed(1)}B`,
                      highlight: true,
                    },
                    {
                      label: "ธงแดง",
                      value: results.stats.redFlagCount,
                      danger: results.stats.redFlagCount > 0,
                    },
                  ]}
                />
                <div className="flex items-center gap-3">
                  <a
                    href={buildExportUrl()}
                    download
                    className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 transition-colors"
                    title="ดาวน์โหลดผลลัพธ์ทั้งหมดเป็น CSV"
                  >
                    <Download size={14} />
                    <span>ดาวน์โหลด CSV</span>
                  </a>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <ArrowUpDown size={14} />
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="bg-transparent border-none focus:outline-none text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category breakdown — visual analysis of what kind of spending
                  the current search/filter is surfacing (e.g. searching
                  "บุคลากร" should visibly skew this bar toward that segment) */}
              {(results.stats.categoryBreakdown?.length ?? 0) > 0 && (
                <div className="pb-3 pt-1">
                  <p className="text-[11px] text-gray-400 mb-1.5">
                    สัดส่วนวงเงินของผลลัพธ์ จำแนกตามหมวดงบประมาณ
                  </p>
                  <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {results.stats.categoryBreakdown!.map((c) => (
                      <div
                        key={c.budgetType}
                        style={{
                          width: `${c.percentage}%`,
                          backgroundColor: BUDGET_TYPE_COLORS[c.budgetType] ?? "#9CA3AF",
                        }}
                        title={`${BUDGET_TYPE_LABELS[c.budgetType] ?? c.budgetType}: ${c.percentage}%`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {results.stats.categoryBreakdown!.map((c) => (
                      <span
                        key={c.budgetType}
                        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: BUDGET_TYPE_COLORS[c.budgetType] ?? "#9CA3AF" }}
                        />
                        {BUDGET_TYPE_LABELS[c.budgetType] ?? c.budgetType}
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {c.percentage}%
                        </span>
                        <span className="text-gray-400">
                          (฿{(c.amount / 1e9).toFixed(2)}B)
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Result table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                กำลังค้นหา...
              </div>
            ) : !results || results.results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Search size={32} className="mb-2 opacity-40" />
                <p>ไม่พบโครงการที่ตรงกับเงื่อนไข</p>
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                        โครงการ
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                        หน่วยงาน
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">
                        วงเงิน
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">
                        เทียบปีก่อน
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                        สถานะ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {results.results.map((proj) => (
                      <tr
                        key={proj.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          proj.flags.some((f) => f.severity === "critical")
                            ? "bg-red-50/40 dark:bg-red-900/5"
                            : proj.flags.length > 0
                            ? "bg-amber-50/40 dark:bg-amber-900/5"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/project/${proj.id}?year=${year}`}
                            className="font-medium text-gray-900 dark:text-gray-100 hover:text-[#7F77DD] line-clamp-2"
                          >
                            {proj.name}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {BUDGET_TYPE_LABELS[proj.budgetType] ?? proj.budgetType}
                            {proj.province !== "กรุงเทพมหานคร" &&
                              proj.province !== "ทั่วประเทศ" &&
                              ` • ${proj.province}`}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          <p>{proj.ministryName}</p>
                          <p className="text-gray-400">{proj.departmentName}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          ฿{(proj.amount / 1e9).toFixed(2)}B
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-medium ${
                              proj.changePct > 50
                                ? "text-red-600 dark:text-red-400"
                                : proj.changePct > 10
                                ? "text-amber-600 dark:text-amber-400"
                                : proj.changePct < 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-500"
                            }`}
                          >
                            {proj.changePct >= 0 ? "+" : ""}
                            {proj.changePct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {proj.flags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {proj.flags.map((f, i) => (
                                <RedFlagBadge
                                  key={i}
                                  severity={f.severity}
                                  label={f.label}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">ปกติ</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {results.total > 20 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-500">
                      แสดง {(page - 1) * 20 + 1}–
                      {Math.min(page * 20, results.total)} จาก{" "}
                      {results.total.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-3 py-1 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        ก่อนหน้า
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-600">
                        หน้า {page} / {Math.ceil(results.total / 20)}
                      </span>
                      <button
                        disabled={page * 20 >= results.total}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3 py-1 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        ถัดไป
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
