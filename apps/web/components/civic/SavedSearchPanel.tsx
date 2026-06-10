"use client";

import { useState, useRef, useEffect } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Bookmark, BookmarkPlus, Trash2, Loader2, X } from "lucide-react";

export interface SearchFiltersSnapshot {
  q?: string;
  ministries?: string[];
  budgetTypes?: string[];
  status?: string[];
  minAmount?: string;
  maxAmount?: string;
  sort?: string;
  year?: string;
}

interface SavedSearch {
  id: string;
  label: string;
  filters: string;
  resultCount: number | null;
  createdAt: string;
}

interface Props {
  currentFilters: SearchFiltersSnapshot;
  currentResultCount?: number;
  onApply: (filters: SearchFiltersSnapshot) => void;
  isLoggedIn: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const STORAGE_KEY = "civic_saved_searches";

function loadLocalSearches(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSearches(searches: SavedSearch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
}

export default function SavedSearchPanel({
  currentFilters,
  currentResultCount,
  onApply,
  isLoggedIn,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [localSearches, setLocalSearches] = useState<SavedSearch[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSearches(loadLocalSearches());
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const { data: remoteData } = useSWR<{ searches: SavedSearch[] }>(
    isLoggedIn && open ? "/api/civic/saved-searches" : null,
    fetcher
  );

  const searches = isLoggedIn ? (remoteData?.searches ?? []) : localSearches;

  async function handleSave() {
    if (!labelInput.trim()) return;
    setSaving(true);
    const newEntry: SavedSearch = {
      id: Date.now().toString(),
      label: labelInput.trim(),
      filters: JSON.stringify(currentFilters),
      resultCount: currentResultCount ?? null,
      createdAt: new Date().toISOString(),
    };

    if (isLoggedIn) {
      await fetch("/api/civic/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newEntry.label,
          filters: currentFilters,
          resultCount: currentResultCount,
        }),
      });
      globalMutate("/api/civic/saved-searches");
    } else {
      const updated = [newEntry, ...localSearches].slice(0, 20);
      setLocalSearches(updated);
      saveLocalSearches(updated);
    }

    setSaving(false);
    setLabelInput("");
    setShowSaveForm(false);
  }

  async function handleDelete(id: string) {
    if (isLoggedIn) {
      await fetch(`/api/civic/saved-searches?id=${id}`, { method: "DELETE" });
      globalMutate("/api/civic/saved-searches");
    } else {
      const updated = localSearches.filter((s) => s.id !== id);
      setLocalSearches(updated);
      saveLocalSearches(updated);
    }
  }

  function handleApply(search: SavedSearch) {
    try {
      const f = JSON.parse(search.filters) as SearchFiltersSnapshot;
      onApply(f);
      setOpen(false);
    } catch {
      // malformed saved filter — ignore
    }
  }

  const hasFilters = Object.values(currentFilters).some((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  );

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
          open
            ? "bg-[#7F77DD] text-white border-[#7F77DD]"
            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#7F77DD] hover:text-[#7F77DD]"
        }`}
        title="การค้นหาที่บันทึกไว้"
      >
        <Bookmark size={14} />
        <span className="hidden sm:inline">
          บันทึก{searches.length > 0 ? ` (${searches.length})` : ""}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
              การค้นหาที่บันทึกไว้
            </span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>

          {/* Save current search */}
          {hasFilters && (
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              {showSaveForm ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    placeholder="ชื่อการค้นหา..."
                    className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving || !labelInput.trim()}
                    className="px-3 py-1.5 bg-[#7F77DD] text-white text-sm rounded-lg disabled:opacity-50 hover:bg-[#534AB7] transition-colors"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : "บันทึก"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="flex items-center gap-1.5 text-sm text-[#7F77DD] hover:text-[#534AB7] transition-colors"
                >
                  <BookmarkPlus size={14} />
                  บันทึกการค้นหานี้
                </button>
              )}
              {!isLoggedIn && (
                <p className="text-xs text-gray-400 mt-1">
                  บันทึกในเบราว์เซอร์นี้ —{" "}
                  <a href="/login" className="text-[#7F77DD] hover:underline">
                    เข้าสู่ระบบ
                  </a>{" "}
                  เพื่อซิงค์ข้ามอุปกรณ์
                </p>
              )}
            </div>
          )}

          {/* Saved list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {searches.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                ยังไม่มีการค้นหาที่บันทึกไว้
              </div>
            ) : (
              searches.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <button
                    onClick={() => handleApply(s)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                      {s.label}
                    </p>
                    {s.resultCount !== null && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.resultCount.toLocaleString()} โครงการ
                      </p>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors"
                    title="ลบ"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
