"use client";

import { useState, useMemo } from "react";
import type { ProvinceData } from "@/lib/civic-cache";

// Thailand regions — province names must match what's in the budget JSON
const REGIONS: { name: string; provinces: string[] }[] = [
  {
    name: "กรุงเทพฯ และปริมณฑล",
    provinces: ["กรุงเทพมหานคร", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "สมุทรสาคร"],
  },
  {
    name: "ภาคกลาง",
    provinces: [
      "พระนครศรีอยุธยา", "อ่างทอง", "สระบุรี", "ลพบุรี", "สิงห์บุรี",
      "ชัยนาท", "นครนายก", "ปราจีนบุรี", "สระแก้ว", "ฉะเชิงเทรา",
      "ชลบุรี", "ระยอง", "จันทบุรี", "ตราด", "กาญจนบุรี", "ราชบุรี",
      "สุพรรณบุรี", "นครปฐม", "สมุทรสงคราม", "เพชรบุรี", "ประจวบคีรีขันธ์",
    ],
  },
  {
    name: "ภาคเหนือ",
    provinces: [
      "เชียงใหม่", "เชียงราย", "แม่ฮ่องสอน", "ลำปาง", "ลำพูน",
      "พะเยา", "แพร่", "น่าน", "อุตรดิตถ์", "ตาก", "สุโขทัย",
      "กำแพงเพชร", "พิษณุโลก", "พิจิตร", "เพชรบูรณ์", "นครสวรรค์", "อุทัยธานี",
    ],
  },
  {
    name: "ภาคตะวันออกเฉียงเหนือ",
    provinces: [
      "นครราชสีมา", "บุรีรัมย์", "สุรินทร์", "ศรีสะเกษ", "อุบลราชธานี",
      "ยโสธร", "อำนาจเจริญ", "มุกดาหาร", "ร้อยเอ็ด", "กาฬสินธุ์",
      "มหาสารคาม", "ขอนแก่น", "เลย", "หนองบัวลำภู", "อุดรธานี",
      "หนองคาย", "บึงกาฬ", "สกลนคร", "นครพนม", "ชัยภูมิ",
    ],
  },
  {
    name: "ภาคใต้",
    provinces: [
      "ชุมพร", "ระนอง", "สุราษฎร์ธานี", "นครศรีธรรมราช", "พัทลุง",
      "สงขลา", "ตรัง", "พังงา", "กระบี่", "ภูเก็ต",
      "สตูล", "ปัตตานี", "ยะลา", "นราธิวาส",
    ],
  },
];

const REGION_COLORS = [
  { bg: "#7F77DD", light: "#EEE8FF" },
  { bg: "#059669", light: "#D1FAE5" },
  { bg: "#D97706", light: "#FEF3C7" },
  { bg: "#DC2626", light: "#FEE2E2" },
  { bg: "#0284C7", light: "#E0F2FE" },
];

interface Props {
  provinces: ProvinceData[];
  year: string;
}

export default function BudgetMapView({ provinces, year }: Props) {
  const [activeRegion, setActiveRegion] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Build a map for quick lookup by province name
  const provinceMap = useMemo(() => {
    const m = new Map<string, ProvinceData>();
    for (const p of provinces) m.set(p.province, p);
    return m;
  }, [provinces]);

  // Nationwide / unspecified buckets
  const nationwide = provinces.find((p) => p.province === "ทั่วประเทศ");
  const unspecified = provinces.find((p) => p.province === "ไม่ระบุ");

  // Build region aggregates from actual province data
  const regionStats = useMemo(() =>
    REGIONS.map((region, i) => {
      let budget = 0;
      let projectCount = 0;
      let redFlagCount = 0;
      const found: ProvinceData[] = [];
      for (const pName of region.provinces) {
        const pd = provinceMap.get(pName);
        if (pd) {
          budget += pd.budget;
          projectCount += pd.projectCount;
          redFlagCount += pd.redFlagCount;
          found.push(pd);
        }
      }
      return { ...region, budget, projectCount, redFlagCount, found, color: REGION_COLORS[i] };
    }),
  [provinceMap]);

  const totalMapped = regionStats.reduce((s, r) => s + r.budget, 0);
  const totalBudget = provinces.reduce((s, p) => s + p.budget, 0);

  // Province search results (excludes ทั่วประเทศ / ไม่ระบุ)
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return provinces
      .filter(
        (p) =>
          p.province !== "ทั่วประเทศ" &&
          p.province !== "ไม่ระบุ" &&
          p.province.includes(search.trim())
      )
      .slice(0, 10);
  }, [provinces, search]);

  const activeProvinces =
    activeRegion !== null
      ? regionStats[activeRegion].found.sort((a, b) => b.budget - a.budget)
      : [];

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-gray-500">
            การกระจายงบประมาณรายจังหวัด ปีงบประมาณ พ.ศ. {year}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            คลิกภูมิภาคเพื่อดูรายละเอียดรายจังหวัด
          </p>
        </div>

        {/* Province search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาจังหวัด..."
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7F77DD] w-44"
        />
      </div>

      {/* Search results overlay */}
      {searchResults.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500">
            ผลการค้นหา ({searchResults.length} จังหวัด)
          </div>
          {searchResults.map((pd) => (
            <div
              key={pd.province}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {pd.province}
                </span>
                <span className="text-xs text-gray-400 ml-2">{pd.projectCount.toLocaleString()} โครงการ</span>
                {pd.redFlagCount > 0 && (
                  <span className="ml-2 text-xs text-red-500">🚩 {pd.redFlagCount}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-[#7F77DD]">
                ฿{(pd.budget / 1e9).toFixed(2)}B
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Nationwide & unspecified banners */}
      {(nationwide || unspecified) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nationwide && (
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-400">ทั่วประเทศ</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {nationwide.projectCount.toLocaleString()} โครงการ
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#7F77DD]">
                  ฿{(nationwide.budget / 1e9).toFixed(1)}B
                </p>
                <p className="text-xs text-gray-400">
                  {totalBudget > 0 ? ((nationwide.budget / totalBudget) * 100).toFixed(1) : 0}% ของงบรวม
                </p>
              </div>
            </div>
          )}
          {unspecified && (
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-400">ไม่ระบุจังหวัด</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {unspecified.projectCount.toLocaleString()} โครงการ
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-500">
                  ฿{(unspecified.budget / 1e9).toFixed(1)}B
                </p>
                <p className="text-xs text-gray-400">
                  {totalBudget > 0 ? ((unspecified.budget / totalBudget) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Region cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {regionStats.map((region, ri) => {
          const isActive = activeRegion === ri;
          const pct = totalMapped > 0 ? (region.budget / totalMapped) * 100 : 0;
          return (
            <div
              key={region.name}
              className={`rounded-xl border overflow-hidden cursor-pointer transition-all ${
                isActive
                  ? "border-[#7F77DD] ring-2 ring-[#7F77DD]/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
              onClick={() => setActiveRegion(isActive ? null : ri)}
            >
              {/* Region header */}
              <div
                className="px-4 py-3"
                style={{ backgroundColor: region.color.bg }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-white">{region.name}</p>
                  {region.redFlagCount > 0 && (
                    <span className="text-xs bg-white/20 text-white rounded-full px-2 py-0.5">
                      🚩 {region.redFlagCount}
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between mt-1">
                  <p className="text-white/80 text-xs">{region.found.length}/{region.provinces.length} จังหวัด • {region.projectCount.toLocaleString()} โครงการ</p>
                  <p className="font-bold text-white">฿{(region.budget / 1e9).toFixed(1)}B</p>
                </div>
                {/* Budget bar */}
                <div className="mt-2 bg-white/20 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-white/70 rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-white/70 mt-0.5">{pct.toFixed(1)}% ของงบภูมิภาค</p>
              </div>

              {/* Province list (collapsed) */}
              <div
                className="px-4 py-3 bg-white dark:bg-gray-900"
                style={{ backgroundColor: isActive ? region.color.light : undefined }}
              >
                {region.budget === 0 ? (
                  <p className="text-xs text-gray-400">ไม่พบข้อมูลโครงการในภูมิภาคนี้</p>
                ) : isActive ? (
                  <div className="space-y-1.5">
                    {region.found.slice(0, 8).map((pd) => (
                      <div key={pd.province} className="flex items-center justify-between">
                        <span className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          {pd.province}
                          {pd.redFlagCount > 0 && (
                            <span className="text-red-400 text-xs">🚩</span>
                          )}
                        </span>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                          ฿{(pd.budget / 1e9).toFixed(2)}B
                        </span>
                      </div>
                    ))}
                    {region.found.length > 8 && (
                      <p className="text-xs text-gray-400">+{region.found.length - 8} จังหวัดอื่นๆ</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {region.found.slice(0, 5).map((pd) => (
                      <span
                        key={pd.province}
                        className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500"
                      >
                        {pd.province}
                      </span>
                    ))}
                    {region.found.length > 5 && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-400">
                        +{region.found.length - 5}
                      </span>
                    )}
                    {region.found.length === 0 && (
                      <span className="text-xs text-gray-400">คลิกเพื่อดูรายละเอียด</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Top provinces by budget — always visible */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Top 10 จังหวัดที่ได้รับงบสูงสุด
          </h4>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {provinces
            .filter((p) => p.province !== "ทั่วประเทศ" && p.province !== "ไม่ระบุ")
            .slice(0, 10)
            .map((pd, i) => {
              const pct = totalBudget > 0 ? (pd.budget / totalBudget) * 100 : 0;
              return (
                <div key={pd.province} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                        {pd.province}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {pd.redFlagCount > 0 && (
                          <span className="text-xs text-red-400">🚩 {pd.redFlagCount}</span>
                        )}
                        <span className="text-sm font-semibold text-[#7F77DD]">
                          ฿{(pd.budget / 1e9).toFixed(2)}B
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-[#7F77DD] rounded-full"
                        style={{ width: `${Math.min(pct * 5, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
