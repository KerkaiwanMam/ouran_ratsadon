"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Treemap, ResponsiveContainer } from "recharts";
import { AlertTriangle, ArrowUpDown, ChevronRight } from "lucide-react";
import type { MinistryListItem, MinistryWithFullData, ColorCategory, ProjectSummary } from "@/types/civic";
import BreadcrumbNav from "./BreadcrumbNav";
import RedFlagBadge from "./RedFlagBadge";

// ─── Color palette ────────────────────────────────────────────────────────────

const COLOR_MAP: Record<ColorCategory, { bg: string; hover: string; light: string }> = {
  purple: { bg: "#7F77DD", hover: "#534AB7", light: "#EDE9FF" },
  amber:  { bg: "#EF9F27", hover: "#BA7517", light: "#FEF3C7" },
  teal:   { bg: "#1D9E75", hover: "#158057", light: "#D1FAE5" },
  coral:  { bg: "#E24B4A", hover: "#A32D2D", light: "#FEE2E2" },
  gray:   { bg: "#6B7280", hover: "#4B5563", light: "#F3F4F6" },
};

const BUDGET_TYPE_LABELS: Record<string, string> = {
  personnel:  "บุคลากร",
  operating:  "ดำเนินงาน",
  investment: "ลงทุน",
  other:      "อื่นๆ",
};

const BUDGET_TYPE_COLORS: Record<string, string> = {
  personnel:  "#7F77DD",
  operating:  "#34D399",
  investment: "#FBBF24",
  other:      "#9CA3AF",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type DrillLevel = 0 | 1 | 2;
type SortKey = "amount" | "name" | "flag";

interface TreeNode {
  id: string;
  name: string;
  size: number;
  budget: number;
  redFlagCount: number;
  colorCategory: ColorCategory;
  percentage?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatShort(amount: number): string {
  if (amount >= 1e12) return `฿${(amount / 1e12).toFixed(1)}ล.ล.`;
  if (amount >= 1e9)  return `฿${(amount / 1e9).toFixed(0)}B`;
  if (amount >= 1e6)  return `฿${(amount / 1e6).toFixed(0)}M`;
  if (amount >= 1e3)  return `฿${(amount / 1e3).toFixed(0)}K`;
  return `฿${amount.toLocaleString()}`;
}

function formatFull(amount: number): string {
  if (amount >= 1e9) return `฿${(amount / 1e9).toFixed(2)} พันล้าน`;
  if (amount >= 1e6) return `฿${(amount / 1e6).toFixed(2)} ล้าน`;
  return `฿${amount.toLocaleString()}`;
}

function abbrev(name: string, maxChars: number): string {
  if (!name) return "";
  const short = name
    .replace(/^กระทรวง/, "กต.")
    .replace(/^สำนักงาน/, "สนง.")
    .replace(/^กรม/, "กรม")
    .replace(/^สำนัก(?!งาน)/, "สนก.");
  if (short.length <= maxChars) return short;
  return short.slice(0, maxChars - 1) + "…";
}

// ─── Custom cell renderer ─────────────────────────────────────────────────────

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  size?: number;
  id?: string;
  redFlagCount?: number;
  colorCategory?: ColorCategory;
  percentage?: number;
  onCellClick: (id: string) => void;
  level: DrillLevel;
}

function CustomCell({
  x = 0, y = 0, width = 0, height = 0,
  name, size, id,
  redFlagCount = 0, colorCategory = "gray", percentage,
  onCellClick, level,
}: CellProps) {
  const [hovered, setHovered] = useState(false);
  const colors = COLOR_MAP[colorCategory];

  if (width < 4 || height < 4 || !id) return <g />;

  const showName   = width > 48 && height > 30;
  const showAmount = width > 72 && height > 58;
  const showPct    = width > 110 && height > 80;
  const showFlag   = redFlagCount > 0 && width > 36 && height > 28;
  const showMicro  = !showName && width >= 14 && height >= 14;
  // Level 2: show "→" indicator on hover to hint navigation
  const showNavHint = level === 2 && hovered && width > 40 && height > 40;

  const fontSize = width > 180 ? 13 : width > 90 ? 11 : 9;
  const displayName = name ?? "";

  const fillColor = hovered ? colors.hover : colors.bg;

  return (
    <g
      cursor="pointer"
      onClick={() => onCellClick(id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <title>{`${displayName} — ${formatShort(size ?? 0)}${
        percentage !== undefined ? ` (${percentage.toFixed(1)}%)` : ""
      }${level === 2 ? " — คลิกเพื่อดูรายละเอียด" : ""}`}</title>

      <rect
        x={x + 1} y={y + 1}
        width={width - 2} height={height - 2}
        fill={fillColor}
        stroke="#fff"
        strokeWidth={level === 2 ? 1 : 2}
        rx={3}
        style={{ transition: "fill 0.12s" }}
      />

      {/* Hover overlay tint for level 2 */}
      {level === 2 && hovered && (
        <rect
          x={x + 1} y={y + 1}
          width={width - 2} height={height - 2}
          fill="rgba(255,255,255,0.12)"
          rx={3}
          style={{ pointerEvents: "none" }}
        />
      )}

      {showName && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showAmount ? 10 : 0)}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.95)"
          fontSize={fontSize} fontWeight={600}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {abbrev(displayName, width > 180 ? 18 : width > 90 ? 12 : 7)}
        </text>
      )}

      {showMicro && (
        <text
          x={x + width / 2} y={y + height / 2}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.7)"
          fontSize={8}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {displayName.slice(0, 2)}
        </text>
      )}

      {showAmount && size !== undefined && (
        <text
          x={x + width / 2}
          y={y + height / 2 + (showName ? 12 : 0)}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.72)"
          fontSize={9}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {formatShort(size)}
          {showPct && percentage !== undefined && ` (${percentage.toFixed(1)}%)`}
        </text>
      )}

      {showFlag && (
        <>
          <rect x={x + width - 22} y={y + 4} width={18} height={14} rx={7} fill="rgba(0,0,0,0.35)" />
          <text
            x={x + width - 13} y={y + 12}
            textAnchor="middle" dominantBaseline="middle"
            fill="#FCD34D" fontSize={9} fontWeight={700}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {redFlagCount > 9 ? "9+" : redFlagCount}
          </text>
        </>
      )}

      {showNavHint && (
        <text
          x={x + width / 2}
          y={y + height - 10}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.85)"
          fontSize={9}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          ดูรายละเอียด →
        </text>
      )}
    </g>
  );
}

// ─── Project list panel (level 2) ────────────────────────────────────────────

function ProjectListPanel({
  projects,
  year,
  deptBudget,
  colorCategory,
}: {
  projects: ProjectSummary[];
  year?: string;
  deptBudget: number;
  colorCategory: ColorCategory;
}) {
  const [sort, setSort] = useState<SortKey>("amount");
  const [showAll, setShowAll] = useState(false);

  const color = COLOR_MAP[colorCategory];
  const SHOW_LIMIT = 12;

  const sorted = [...projects].sort((a, b) => {
    if (sort === "amount") return b.amount - a.amount;
    if (sort === "flag")   return (b.hasFlag ? 1 : 0) - (a.hasFlag ? 1 : 0);
    return a.name.localeCompare(b.name, "th");
  });

  const visible = showAll ? sorted : sorted.slice(0, SHOW_LIMIT);
  const flagCount = projects.filter((p) => p.hasFlag).length;
  const yearParam = year ? `?year=${year}` : "";

  return (
    <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
      {/* ── Solid header — strong contrast, never blends with white rows ── */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ backgroundColor: color.bg }}
      >
        <div>
          <p className="text-sm font-bold text-white tracking-wide">
            รายการโครงการ
            <span className="ml-2 text-xs font-normal text-white/70">
              {projects.length.toLocaleString()} รายการ
            </span>
          </p>
          {flagCount > 0 && (
            <p className="text-xs text-white/80 mt-0.5 flex items-center gap-1">
              <AlertTriangle size={11} />
              {flagCount} โครงการมีธงแดง
            </p>
          )}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1 text-xs">
          <ArrowUpDown size={12} className="text-white/60 mr-0.5" />
          {(["amount", "name", "flag"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                sort === k
                  ? "bg-white text-gray-800"
                  : "text-white/80 hover:bg-white/20"
              }`}
            >
              {k === "amount" ? "วงเงิน" : k === "name" ? "ชื่อ" : "ธงแดง"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Column header row ── */}
      <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-4 px-5 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-[11px] font-semibold text-gray-400 text-right">#</span>
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">ชื่อโครงการ</span>
        <span className="text-[11px] font-semibold text-gray-400 text-right pr-1">วงเงิน</span>
      </div>

      {/* ── Project rows ── */}
      {visible.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400 bg-white dark:bg-gray-900">
          ไม่มีข้อมูลโครงการในหน่วยงานนี้
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {visible.map((p, i) => {
            const pct    = deptBudget > 0 ? (p.amount / deptBudget) * 100 : 0;
            const barPct = Math.min((pct / Math.max(...sorted.map(s => deptBudget > 0 ? (s.amount/deptBudget)*100 : 0))) * 100, 100);
            const typeColor = BUDGET_TYPE_COLORS[p.budgetType] ?? "#9CA3AF";
            const typeLabel = BUDGET_TYPE_LABELS[p.budgetType] ?? p.budgetType;

            return (
              <Link
                key={`${p.id}-${i}`}
                href={`/project/${encodeURIComponent(p.id)}${yearParam}`}
                className="group flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {/* Rank */}
                <span className="text-xs text-gray-300 dark:text-gray-600 w-5 mt-0.5 text-right shrink-0 select-none tabular-nums">
                  {i + 1}
                </span>

                {/* Project info */}
                <div className="flex-1 min-w-0">
                  {/* Name + chevron */}
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug line-clamp-2 group-hover:text-[#7F77DD] dark:group-hover:text-[#A9A3F0] transition-colors">
                      {p.name}
                    </p>
                    <ChevronRight
                      size={14}
                      className="shrink-0 mt-0.5 text-gray-300 dark:text-gray-600 group-hover:text-[#7F77DD] dark:group-hover:text-[#A9A3F0] transition-colors"
                    />
                  </div>

                  {/* Meta row */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* Budget bar + amount */}
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${barPct}%`, backgroundColor: color.bg }}
                        />
                      </div>
                      <span
                        className="text-xs font-semibold tabular-nums whitespace-nowrap"
                        style={{ color: color.bg }}
                      >
                        {formatFull(p.amount)}
                      </span>
                      <span className="text-xs text-gray-400 tabular-nums">
                        ({pct.toFixed(1)}%)
                      </span>
                    </div>

                    {/* Type badge */}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium border shrink-0"
                      style={{
                        backgroundColor: typeColor + "18",
                        color: typeColor,
                        borderColor: typeColor + "40",
                      }}
                    >
                      {typeLabel}
                    </span>

                    {/* Red flag badge — uses shared RedFlagBadge component */}
                    {p.hasFlag && p.firstFlag && (
                      <RedFlagBadge
                        severity={p.firstFlag.severity}
                        label={p.firstFlag.label}
                        size="sm"
                      />
                    )}
                    {p.hasFlag && !p.firstFlag && (
                      <RedFlagBadge severity="warning" label="ธงแดง" size="sm" />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Show more / less ── */}
      {sorted.length > SHOW_LIMIT && (
        <div
          className="px-5 py-3 text-center border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-sm font-semibold transition-colors hover:underline"
            style={{ color: color.bg }}
          >
            {showAll ? "แสดงน้อยลง ↑" : `แสดงทั้งหมด ${sorted.length} รายการ ↓`}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  ministries: MinistryListItem[];
  fullData?: MinistryWithFullData[];
  year?: string;
}

export default function MinistryTreemap({ ministries, fullData, year }: Props) {
  const router = useRouter();
  const [selectedMinistry, setSelectedMinistry] = useState<MinistryListItem | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const level: DrillLevel = selectedDeptId ? 2 : selectedMinistry ? 1 : 0;

  // ── Level 0 data ─────────────────────────────────────────────────────
  const ministryData: TreeNode[] = ministries.map((m) => ({
    id: m.id, name: m.name, size: m.budget, budget: m.budget,
    redFlagCount: m.redFlagCount, colorCategory: m.colorCategory,
    percentage: m.percentage,
  }));

  // ── Level 1 data ─────────────────────────────────────────────────────
  const selectedMinistryFull =
    selectedMinistry && fullData
      ? fullData.find((m) => m.id === selectedMinistry.id) ?? null
      : null;

  const deptData: TreeNode[] = selectedMinistryFull
    ? selectedMinistryFull.departments.map((d) => ({
        id: d.id, name: d.name, size: d.budget, budget: d.budget,
        redFlagCount: d.redFlagCount,
        colorCategory: selectedMinistry!.colorCategory,
        percentage: selectedMinistry!.budget > 0
          ? (d.budget / selectedMinistry!.budget) * 100 : 0,
      }))
    : [];

  // ── Level 2 data ─────────────────────────────────────────────────────
  const projectData: TreeNode[] = (projects ?? []).map((p) => ({
    id: p.id, name: p.name, size: p.amount, budget: p.amount,
    redFlagCount: p.hasFlag ? 1 : 0,
    colorCategory: selectedMinistry?.colorCategory ?? "gray",
    percentage:
      selectedMinistryFull && selectedDeptId
        ? (p.amount /
            (selectedMinistryFull.departments.find((d) => d.id === selectedDeptId)?.budget ?? 1)) * 100
        : 0,
  }));

  const currentData =
    level === 2 ? projectData : level === 1 ? deptData : ministryData;

  const selectedDept = selectedMinistryFull?.departments.find((d) => d.id === selectedDeptId);
  const deptBudget = selectedDept?.budget ?? 0;

  // ── Click handler ─────────────────────────────────────────────────────
  const handleCellClick = useCallback(
    async (id: string) => {
      if (level === 0) {
        const m = ministries.find((m) => m.id === id) ?? null;
        setSelectedMinistry(m);
        setSelectedDeptId(null);
        setProjects(null);
      } else if (level === 1 && selectedMinistry) {
        setSelectedDeptId(id);
        setProjects(null);
        setLoadingProjects(true);
        try {
          const res = await fetch(
            `/api/civic/dept-projects?year=${year ?? ""}&ministryId=${selectedMinistry.id}&deptId=${id}`
          );
          const json = await res.json();
          setProjects(json.projects ?? []);
        } catch {
          setProjects([]);
        } finally {
          setLoadingProjects(false);
        }
      } else if (level === 2) {
        // Navigate to project detail page
        router.push(`/project/${encodeURIComponent(id)}${year ? `?year=${year}` : ""}`);
      }
    },
    [level, ministries, selectedMinistry, year, router]
  );

  // ── Breadcrumb ────────────────────────────────────────────────────────
  const selectedDeptName = selectedDept?.name ?? "";

  const breadcrumbs = [
    {
      label: "ทุกกระทรวง",
      onClick: level > 0
        ? () => { setSelectedMinistry(null); setSelectedDeptId(null); setProjects(null); }
        : undefined,
    },
    ...(selectedMinistry
      ? [{
          label: selectedMinistry.name,
          onClick: level > 1
            ? () => { setSelectedDeptId(null); setProjects(null); }
            : undefined,
        }]
      : []),
    ...(selectedDeptId && selectedDeptName ? [{ label: selectedDeptName }] : []),
  ];

  const currentBudget =
    level === 2 ? deptBudget
    : level === 1 ? selectedMinistry?.budget ?? 0
    : ministries.reduce((s, m) => s + m.budget, 0);

  // ── Empty state guard ─────────────────────────────────────────────────
  if (level !== 2 && currentData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        ไม่มีข้อมูล
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BreadcrumbNav items={breadcrumbs} totalBudget={currentBudget} />

      {/* Level-specific hint */}
      {level > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
          <span>
            {level === 1
              ? "คลิกสำนัก / กรม เพื่อดูรายการโครงการ"
              : loadingProjects
              ? "กำลังโหลดโครงการ…"
              : `${projectData.length} โครงการ — คลิกช่องหรือแถวด้านล่างเพื่อดูรายละเอียด`}
          </span>
          <button
            onClick={() => { setSelectedMinistry(null); setSelectedDeptId(null); setProjects(null); }}
            className="text-[#7F77DD] hover:underline ml-4"
          >
            ← กลับภาพรวมทั้งหมด
          </button>
        </div>
      )}

      {/* Treemap */}
      <div className="w-full rounded-xl overflow-hidden" style={{ height: level === 2 ? 360 : 520 }}>
        {loadingProjects ? (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400">
            <svg className="animate-spin h-8 w-8 text-[#7F77DD] mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            กำลังโหลด…
          </div>
        ) : currentData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 gap-2">
            <span className="text-4xl">📂</span>
            <p className="text-sm">ไม่มีข้อมูลโครงการในหน่วยงานนี้</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={currentData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={((props: any) => (
                <CustomCell
                  {...props}
                  onCellClick={handleCellClick}
                  level={level}
                />
              )) as unknown as React.ReactElement}
            />
          </ResponsiveContainer>
        )}
      </div>

      {/* Project list panel — only shown at level 2 */}
      {level === 2 && projects !== null && (
        <ProjectListPanel
          projects={projects}
          year={year}
          deptBudget={deptBudget}
          colorCategory={selectedMinistry?.colorCategory ?? "gray"}
        />
      )}
    </div>
  );
}
