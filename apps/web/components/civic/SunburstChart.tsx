"use client";

import { useState } from "react";
import type { MinistryWithFullData, BudgetTypeBreakdown } from "@/types/civic";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOP_N = 10;

const COLORS_MAIN = [
  "#7F77DD", "#EF9F27", "#1D9E75", "#E24B4A", "#3B82F6",
  "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#06B6D4",
];
const COLOR_OTHER = "#94A3B8";

const BUDGET_TYPE_CONFIG: Record<
  keyof BudgetTypeBreakdown,
  { label: string; color: string }
> = {
  personnel: { label: "งบบุคลากร", color: "#7F77DD" },
  operating: { label: "งบดำเนินงาน", color: "#EF9F27" },
  investment: { label: "งบลงทุน", color: "#1D9E75" },
  other: { label: "รายจ่ายอื่น", color: "#94A3B8" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const a = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const safeEnd = Math.min(endAngle, startAngle + 359.999);
  const o1 = polarToCartesian(cx, cy, r, startAngle);
  const o2 = polarToCartesian(cx, cy, r, safeEnd);
  const i1 = polarToCartesian(cx, cy, innerR, safeEnd);
  const i2 = polarToCartesian(cx, cy, innerR, startAngle);
  const large = safeEnd - startAngle > 180 ? 1 : 0;
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${r} ${r} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y}`,
    "Z",
  ].join(" ");
}

function formatBudget(n: number): string {
  if (n >= 1e12) return `฿${(n / 1e12).toFixed(2)} ล้านล้าน`;
  if (n >= 1e9) return `฿${(n / 1e9).toFixed(1)} พันล้าน`;
  if (n >= 1e6) return `฿${(n / 1e6).toFixed(0)} ล้าน`;
  return `฿${n.toLocaleString("th-TH")}`;
}

// ─── Sector model ─────────────────────────────────────────────────────────────

interface Sector {
  id: string;
  name: string;
  budget: number;
  percentage: number;
  startAngle: number;
  endAngle: number;
  color: string;
  isOther: boolean;
  otherCount?: number; // only for "Others" bucket
  redFlagCount: number;
  clickable: boolean;
}

interface SectorSource {
  id: string;
  name: string;
  budget: number;
  redFlagCount?: number;
  clickable?: boolean;
}

function buildSectors(items: SectorSource[], total: number): Sector[] {
  const sorted = [...items].sort((a, b) => b.budget - a.budget);
  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);

  const display: Array<
    SectorSource & { isOther: boolean; otherCount?: number }
  > = [
    ...top.map((i) => ({ ...i, isOther: false })),
    ...(rest.length > 0
      ? [
          {
            id: "_others",
            name: `อื่นๆ (${rest.length} รายการ)`,
            budget: rest.reduce((s, r) => s + r.budget, 0),
            redFlagCount: rest.reduce((s, r) => s + (r.redFlagCount ?? 0), 0),
            isOther: true,
            otherCount: rest.length,
            clickable: false,
          },
        ]
      : []),
  ];

  let angle = 0;
  return display.map((item, i) => {
    const span = total > 0 ? (item.budget / total) * 360 : 0;
    const s: Sector = {
      id: item.id,
      name: item.name,
      budget: item.budget,
      percentage: total > 0 ? (item.budget / total) * 100 : 0,
      startAngle: angle,
      endAngle: angle + span,
      color: item.isOther ? COLOR_OTHER : COLORS_MAIN[i % COLORS_MAIN.length],
      isOther: item.isOther,
      otherCount: item.otherCount,
      redFlagCount: item.redFlagCount ?? 0,
      clickable: item.clickable !== false && !item.isOther,
    };
    angle += span;
    return s;
  });
}

// ─── Drill state ──────────────────────────────────────────────────────────────

type DrillPath =
  | { level: 0 }
  | { level: 1; ministryId: string }
  | { level: 2; ministryId: string; deptId: string };

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  ministries: MinistryWithFullData[];
  year: string;
}

export default function SunburstChart({ ministries, year }: Props) {
  const [drill, setDrill] = useState<DrillPath>({ level: 0 });
  const [hovered, setHovered] = useState<string | null>(null);

  const cx = 200;
  const cy = 200;
  const outerR = 175;
  const innerR = 70;
  const svgSize = 400;

  // ── Build sectors based on drill level ──────────────────────────────
  let sectors: Sector[] = [];
  let centerTitle = "งบประมาณรวม";
  let centerAmount = ministries.reduce((s, m) => s + m.budget, 0);
  let legendLabel = `กระทรวง (Top ${TOP_N} + อื่นๆ)`;

  if (drill.level === 0) {
    sectors = buildSectors(
      ministries.map((m) => ({
        id: m.id,
        name: m.name,
        budget: m.budget,
        redFlagCount: m.redFlagCount,
        clickable: true,
      })),
      centerAmount
    );
    centerTitle = "งบประมาณรวม";
    legendLabel = `กระทรวง (Top ${TOP_N} + อื่นๆ)`;
  } else if (drill.level === 1) {
    const ministry = ministries.find((m) => m.id === drill.ministryId)!;
    centerAmount = ministry.budget;
    centerTitle = ministry.name.replace("กระทรวง", "กต.");
    legendLabel = `สำนัก / กรม (Top ${TOP_N} + อื่นๆ)`;
    sectors = buildSectors(
      ministry.departments.map((d) => ({
        id: d.id,
        name: d.name,
        budget: d.budget,
        redFlagCount: d.redFlagCount,
        clickable: true,
      })),
      centerAmount
    );
  } else if (drill.level === 2) {
    const ministry = ministries.find((m) => m.id === drill.ministryId)!;
    const dept = ministry.departments.find((d) => d.id === drill.deptId)!;
    centerAmount = dept.budget;
    centerTitle = dept.name;
    legendLabel = "ประเภทค่าใช้จ่าย";
    // 4 budget type sectors
    const bt = dept.budgetTypes;
    const types = (
      Object.keys(BUDGET_TYPE_CONFIG) as Array<keyof BudgetTypeBreakdown>
    )
      .map((k) => ({
        id: k,
        name: BUDGET_TYPE_CONFIG[k].label,
        budget: bt[k],
        redFlagCount: 0,
        clickable: false,
        _color: BUDGET_TYPE_CONFIG[k].color,
      }))
      .filter((t) => t.budget > 0)
      .sort((a, b) => b.budget - a.budget);

    let angle = 0;
    sectors = types.map((t) => {
      const span = centerAmount > 0 ? (t.budget / centerAmount) * 360 : 0;
      const s: Sector = {
        id: t.id,
        name: t.name,
        budget: t.budget,
        percentage: centerAmount > 0 ? (t.budget / centerAmount) * 100 : 0,
        startAngle: angle,
        endAngle: angle + span,
        color: t._color,
        isOther: false,
        redFlagCount: 0,
        clickable: false,
      };
      angle += span;
      return s;
    });
  }

  // ── Event handlers ────────────────────────────────────────────────
  function handleSectorClick(sector: Sector) {
    if (!sector.clickable) return;
    if (drill.level === 0) {
      setDrill({ level: 1, ministryId: sector.id });
    } else if (drill.level === 1) {
      setDrill({ level: 2, ministryId: drill.ministryId, deptId: sector.id });
    }
  }

  function goBack() {
    if (drill.level === 2) {
      setDrill({ level: 1, ministryId: drill.ministryId });
    } else if (drill.level === 1) {
      setDrill({ level: 0 });
    }
    setHovered(null);
  }

  // ── Active hover info ─────────────────────────────────────────────
  const activeSector = hovered ? sectors.find((s) => s.id === hovered) : null;

  // Center display values
  const centerDisplayAmount = activeSector?.budget ?? centerAmount;
  const centerDisplayPct = activeSector?.percentage;

  // Breadcrumb parts
  const ministry1 =
    drill.level >= 1
      ? ministries.find((m) => m.id === (drill as { ministryId: string }).ministryId)
      : null;
  const dept1 =
    drill.level === 2
      ? ministry1?.departments.find(
          (d) => d.id === (drill as { deptId: string }).deptId
        )
      : null;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb navigation */}
      {drill.level > 0 && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1 text-[#7F77DD] hover:underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            กลับ
          </button>
          {[
            "ทุกกระทรวง",
            ministry1?.name,
            dept1?.name,
          ]
            .filter(Boolean)
            .map((label, i, arr) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-300"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
                <span
                  className={
                    i === arr.length - 1
                      ? "font-semibold text-gray-800 dark:text-gray-100"
                      : "text-gray-500 dark:text-gray-400"
                  }
                >
                  {label}
                </span>
              </span>
            ))}
          {drill.level === 2 && (
            <span className="ml-1 text-xs bg-[#7F77DD]/10 text-[#7F77DD] px-2 py-0.5 rounded-full font-medium">
              ประเภทค่าใช้จ่าย
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* ── SVG Donut Chart ───────────────────────────────────────── */}
        <div className="relative shrink-0 mx-auto lg:mx-0">
          <svg
            width={svgSize}
            height={svgSize}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            className="max-w-full"
            aria-label={`Sunburst chart — ปีงบประมาณ ${year}`}
          >
            {sectors.map((s) => {
              const path = arcPath(cx, cy, outerR, innerR, s.startAngle, s.endAngle);
              const isHov = hovered === s.id;
              const span = s.endAngle - s.startAngle;
              const midAngle = (s.startAngle + s.endAngle) / 2;
              const labelR = (outerR + innerR) / 2;
              const lp = polarToCartesian(cx, cy, labelR, midAngle);

              return (
                <g
                  key={s.id}
                  style={{
                    transform: isHov && s.clickable ? "scale(1.025)" : "none",
                    transformOrigin: `${cx}px ${cy}px`,
                    transition: "transform 0.12s ease-out",
                  }}
                >
                  <title>{`${s.name}: ${formatBudget(s.budget)} (${s.percentage.toFixed(1)}%)`}</title>
                  <path
                    d={path}
                    fill={s.color}
                    opacity={hovered && !isHov ? 0.55 : 1}
                    stroke="white"
                    strokeWidth={1.5}
                    className={s.clickable ? "cursor-pointer" : "cursor-default"}
                    onMouseEnter={() => setHovered(s.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleSectorClick(s)}
                    style={{ transition: "opacity 0.1s" }}
                  />
                  {/* Percentage label on arc for slices > 14° */}
                  {span > 14 && (
                    <text
                      x={lp.x}
                      y={lp.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={span > 30 ? "11" : "9"}
                      fill="white"
                      fontWeight="700"
                      className="pointer-events-none select-none"
                    >
                      {s.percentage.toFixed(1)}%
                    </text>
                  )}
                </g>
              );
            })}

            {/* ── Center display ───────────────────────────────────── */}
            <text
              x={cx}
              y={cy - 26}
              textAnchor="middle"
              fontSize="9"
              fill="#9CA3AF"
              className="select-none"
            >
              {activeSector
                ? activeSector.name.slice(0, 20)
                : centerTitle}
            </text>
            <text
              x={cx}
              y={cy - 6}
              textAnchor="middle"
              fontSize="17"
              fontWeight="700"
              fill="#111827"
              className="select-none dark:fill-white"
            >
              {formatBudget(centerDisplayAmount).split(" ")[0]}
            </text>
            <text
              x={cx}
              y={cy + 14}
              textAnchor="middle"
              fontSize="11"
              fill="#6B7280"
              className="select-none"
            >
              {formatBudget(centerDisplayAmount).split(" ").slice(1).join(" ")}
            </text>
            {centerDisplayPct !== undefined ? (
              <text
                x={cx}
                y={cy + 32}
                textAnchor="middle"
                fontSize="10"
                fill="#7F77DD"
                fontWeight="600"
                className="select-none"
              >
                {centerDisplayPct.toFixed(1)}% ของทั้งหมด
              </text>
            ) : (
              <text
                x={cx}
                y={cy + 32}
                textAnchor="middle"
                fontSize="9"
                fill="#9CA3AF"
                className="select-none"
              >
                {drill.level === 0
                  ? `${ministries.length} กระทรวง`
                  : drill.level === 1
                  ? `${sectors.length} หน่วยงาน`
                  : `${sectors.length} ประเภท`}
              </text>
            )}
          </svg>
        </div>

        {/* ── Legend ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
            {legendLabel}
          </p>

          <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1">
            {sectors.map((s) => {
              const isHov = hovered === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSectorClick(s)}
                  onMouseEnter={() => setHovered(s.id)}
                  onMouseLeave={() => setHovered(null)}
                  disabled={!s.clickable}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                    isHov
                      ? "bg-gray-100 dark:bg-gray-700/60"
                      : s.isOther
                      ? "opacity-70"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  } ${s.clickable ? "cursor-pointer" : "cursor-default"}`}
                >
                  {/* Color swatch */}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />

                  {/* Name */}
                  <span className="text-xs text-gray-700 dark:text-gray-200 flex-1 min-w-0 truncate">
                    {s.isOther
                      ? s.name
                      : s.name.replace("กระทรวง", "กต.")}
                  </span>

                  {/* Red flag badge */}
                  {s.redFlagCount > 0 && (
                    <span className="text-xs text-red-400 shrink-0">
                      🚩{s.redFlagCount}
                    </span>
                  )}

                  {/* Proportion bar */}
                  <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1 shrink-0">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${Math.max(s.percentage, 1)}%`,
                        maxWidth: "100%",
                        backgroundColor: s.color,
                      }}
                    />
                  </div>

                  {/* Percentage */}
                  <span className="text-xs tabular-nums text-gray-400 w-10 text-right shrink-0">
                    {s.percentage.toFixed(1)}%
                  </span>

                  {/* Drill indicator */}
                  {s.clickable && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-300 dark:text-gray-600 shrink-0"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            {drill.level < 2
              ? "คลิกที่แผนภูมิหรือรายการเพื่อดูรายละเอียด"
              : "ระดับสุดท้าย: ประเภทค่าใช้จ่าย"}
          </p>
        </div>
      </div>
    </div>
  );
}
