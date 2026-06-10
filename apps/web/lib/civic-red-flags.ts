// Civic Layer red-flag detection — all 4 rules.
// Spec: docs/analyzer-spec.md → "Red flag detection rules (Civic Layer)"
//
// Called once during the admin data-upload step to enrich project records.
// Results are stored in the JSON + Postgres flags field (not computed per-request).
//
// Phase 0 shipped Rules 1 & 2. Phase 1 adds Rules 3 & 4.
//
// Bump CURRENT_ENRICHMENT_VERSION whenever rule thresholds, labels, or logic
// change significantly. getBudgetYear() in civic-cache.ts will auto-re-enrich
// any JSON file whose metadata.enriched_version doesn't match.
export const CURRENT_ENRICHMENT_VERSION = "1.1";

import type {
  CivicBudgetYear,
  BudgetProject,
  BudgetMinistry,
  BudgetDepartment,
  RedFlag,
  BudgetType,
} from "@/types/civic";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mean(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[]): number {
  const m = mean(nums);
  return Math.sqrt(nums.reduce((a, b) => a + (b - m) ** 2, 0) / nums.length);
}

/** Normalize Thai project names for duplicate matching:
 *  - Collapse whitespace
 *  - Replace common abbreviations
 *  - Lowercase for comparison
 */
function normalizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/สนง\./g, "สำนักงาน")
    .replace(/กรม\./g, "กรม")
    .replace(/โครงการ/g, "")
    .replace(/งาน/g, "")
    .replace(/[()（）]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Character-level Jaccard similarity of bigrams. Returns 0-1. */
function nameSimilarity(a: string, b: string): number {
  const na = normalizeProjectName(a);
  const nb = normalizeProjectName(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;
  // Quick length-ratio pre-filter: if lengths differ by >50%, Jaccard < 0.5 anyway
  const shorter = Math.min(na.length, nb.length);
  const longer = Math.max(na.length, nb.length);
  if (shorter / longer < 0.5) return 0;
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s[i] + s[i + 1]);
    return set;
  };
  const sa = bigrams(na);
  const sb = bigrams(nb);
  let inter = 0;
  for (const bigram of sa) if (sb.has(bigram)) inter++;
  return (2 * inter) / (sa.size + sb.size);
}

// ─── Shared guard: skip projects with blank/nan names ─────────────────────────
// "nan" strings survive when the source CSV has empty cells — they must never
// trigger red flags because they represent aggregated budget lines, not real
// named projects, and they trivially match each other at 100% (Rule 3).
const NAN_NAMES = new Set(["nan", "none", "null", "(ไม่ระบุชื่อโครงการ)"]);
function isNamedProject(p: BudgetProject): boolean {
  return !!p.name && !NAN_NAMES.has(p.name.trim().toLowerCase()) && p.name.trim().length >= 3;
}

// ─── Rule 1 — Unusual increase (>50% AND absolute delta > 1 MB) ──────────────
// Threshold rationale: a project going ฿200k → ฿300k (+50%) is a normal
// annual adjustment; we only want to flag cases where the absolute size of the
// increase is meaningful (>฿1 M).

function ruleUnusualIncrease(project: BudgetProject): RedFlag | null {
  if (project.previous_amount === null || project.previous_amount === undefined) return null;
  if (project.previous_amount <= 0) return null; // skip new projects (no history)
  const delta = project.amount - project.previous_amount;
  if (delta <= 0) return null;
  const change = delta / project.previous_amount;
  // Both thresholds must be met to reduce noise on small projects
  if (change <= 0.5) return null;
  if (delta < 1_000_000) return null; // < ฿1 M absolute delta → skip

  const severity = change > 1.0 ? "critical" : "warning";
  const prevB = (project.previous_amount / 1e6).toFixed(1);
  const nowB = (project.amount / 1e6).toFixed(1);
  return {
    rule: "unusual_increase",
    severity,
    label: "เพิ่มผิดปกติ",
    description: `งบปีนี้ ฿${nowB}M เพิ่มขึ้น ${(change * 100).toFixed(0)}% จากปีก่อน (฿${prevB}M)`,
    statistical_context: {
      previous_avg_5yr: project.previous_amount,
      threshold_pct: 50,
    },
  };
}

// ─── Rule 2 — Statistical outlier (>3 SD from category mean) ─────────────────
// Only named projects with amount ≥ ฿1 M are included in the category sample
// so that "nan" aggregate rows and trivially small line items don't distort the
// distribution. The outlier check then only fires on named projects too.

function ruleStatisticalOutlier(
  project: BudgetProject,
  categoryAmounts: number[]
): RedFlag | null {
  if (!isNamedProject(project)) return null;
  if (project.amount < 1_000_000) return null; // sub-฿1 M projects are never outliers
  if (categoryAmounts.length < 5) return null; // min sample size fallback
  const m = mean(categoryAmounts);
  const sd = stdDev(categoryAmounts);
  if (sd === 0) return null;
  const z = (project.amount - m) / sd;
  if (z <= 3) return null;

  const severity = z > 4.5 ? "critical" : "warning";
  const avgB = (m / 1e6).toFixed(1);
  const multiple = m > 0 ? (project.amount / m).toFixed(1) : "—";
  return {
    rule: "statistical_outlier",
    severity,
    label: "มูลค่าสูงผิดปกติ",
    description: `สูงกว่าค่าเฉลี่ยหมวดเดียวกัน (฿${avgB}M) ถึง ${multiple} เท่า (${z.toFixed(1)} SD)`,
    statistical_context: {
      previous_avg_5yr: m,
      std_deviations: z,
      category_avg_multiple: m > 0 ? project.amount / m : 0,
    },
  };
}

// ─── Rule 3 — Duplicate detection (fuzzy name match >80% across departments) ──

interface ProjectRef {
  project: BudgetProject;
  ministryId: string;
  departmentId: string;
}

function ruleDuplicate(
  current: ProjectRef,
  allProjects: ProjectRef[]
): RedFlag | null {
  // Skip unnamed / blank / nan projects — they trivially match each other at
  // 100% similarity, flooding the flag list with meaningless duplicates.
  if (!isNamedProject(current.project)) return null;

  for (const other of allProjects) {
    if (other.project.id === current.project.id) continue;
    if (other.departmentId === current.departmentId) continue; // must be different dept
    if (!isNamedProject(other.project)) continue; // skip nan on the other side too
    const sim = nameSimilarity(current.project.name, other.project.name);
    if (sim < 0.8) continue;

    return {
      rule: "duplicate",
      severity: "warning",
      label: "อาจซ้ำซ้อน",
      description: `ชื่อคล้าย "${other.project.name}" (${(sim * 100).toFixed(0)}%) — อาจซ้ำซ้อนกับหน่วยงานอื่น`,
      statistical_context: {
        previous_avg_5yr: 0,
        match_score: sim,
        matched_project_id: other.project.id,
        matched_project_name: other.project.name,
      },
    };
  }
  return null;
}

// ─── Rule 4 — Ratio anomaly (budget composition deviates >40% from agency avg) ─
//
// Requires ≥3 years of history for the same agency (fallback: skip).
// "Ratio" = each budget_type's share of the department's total.

interface DeptHistory {
  departmentId: string;
  ratios: { [year: string]: { [type in BudgetType]?: number } };
}

function computeRatios(
  projects: BudgetProject[]
): { [type in BudgetType]?: number } {
  const totals: Partial<Record<BudgetType, number>> = {};
  let sum = 0;
  for (const p of projects) {
    totals[p.budget_type] = (totals[p.budget_type] ?? 0) + p.amount;
    sum += p.amount;
  }
  if (sum === 0) return {};
  const ratios: Partial<Record<BudgetType, number>> = {};
  for (const [type, amount] of Object.entries(totals)) {
    ratios[type as BudgetType] = amount / sum;
  }
  return ratios;
}

function ruleRatioAnomaly(
  dept: BudgetDepartment,
  historicalData: CivicBudgetYear[],
  currentYear: string
): Map<string, RedFlag> {
  const flags = new Map<string, RedFlag>();
  if (historicalData.length < 3) return flags;

  // Collect historical ratios for this department
  const deptId = dept.id;
  const historicalRatios: { [type in BudgetType]?: number }[] = [];

  for (const yearData of historicalData) {
    if (yearData.fiscal_year === currentYear) continue;
    for (const m of yearData.ministries) {
      for (const d of m.departments) {
        if (d.id !== deptId) continue;
        historicalRatios.push(computeRatios(d.projects));
      }
    }
  }

  if (historicalRatios.length < 3) return flags;

  const currentRatios = computeRatios(dept.projects);
  const budgetTypes: BudgetType[] = ["personnel", "operating", "investment"];

  for (const type of budgetTypes) {
    const historicalValues = historicalRatios
      .map((r) => r[type] ?? 0)
      .filter((v) => v > 0);
    if (historicalValues.length < 3) continue;

    const avgHistorical = mean(historicalValues);
    const current = currentRatios[type] ?? 0;
    if (avgHistorical === 0) continue;

    const deviation = Math.abs(current - avgHistorical) / avgHistorical;
    if (deviation <= 0.4) continue;

    const typeLabel = ({ personnel: "บุคลากร", operating: "ดำเนินงาน", investment: "ลงทุน", other: "อื่นๆ" } as Record<string, string>)[type];

    for (const project of dept.projects) {
      if (project.budget_type !== type) continue;
      flags.set(project.id, {
        rule: "ratio_anomaly",
        severity: deviation > 0.7 ? "critical" : "warning",
        label: "สัดส่วนผิดปกติ",
        description: `สัดส่วนงบ${typeLabel}เบี่ยงเบนจากค่าเฉลี่ยย้อนหลัง ${(deviation * 100).toFixed(0)}%`,
        statistical_context: {
          previous_avg_5yr: avgHistorical,
          threshold_pct: 40,
        },
      });
    }
  }

  return flags;
}

// ─── Main enrichment function ─────────────────────────────────────────────────
//
// Called during admin upload with all available yearly data.
// Returns a new CivicBudgetYear with flags populated on every project.

export function enrichWithRedFlags(
  current: CivicBudgetYear,
  allYears: CivicBudgetYear[]
): CivicBudgetYear {
  // Build category (budget_type) amount arrays for Rule 2.
  // Only include named projects with amount ≥ ฿1 M so that "nan" aggregate
  // rows and trivially small items don't distort the category distribution.
  const categoryAmountsMap: Record<string, number[]> = {};
  for (const m of current.ministries) {
    for (const d of m.departments) {
      for (const p of d.projects) {
        if (!isNamedProject(p) || p.amount < 1_000_000) continue;
        const key = p.budget_type;
        if (!categoryAmountsMap[key]) categoryAmountsMap[key] = [];
        categoryAmountsMap[key].push(p.amount);
      }
    }
  }

  // Build per-ministry project refs for Rule 3 (cross-dept duplicate detection).
  // Deliberately scoped to same-ministry rather than all projects: cross-ministry
  // duplication has different policy implications and would require O(n²) global
  // comparisons (~900M pairs for a 30k-project dataset). Within-ministry reduces
  // this to O(n²/m) ≈ 30M — a 30x speedup for a typical Thai government budget.
  const ministryProjectsMap = new Map<string, ProjectRef[]>();
  for (const m of current.ministries) {
    const refs: ProjectRef[] = [];
    for (const d of m.departments) {
      for (const p of d.projects) {
        refs.push({ project: p, ministryId: m.id, departmentId: d.id });
      }
    }
    ministryProjectsMap.set(m.id, refs);
  }

  // Historical data for Rule 4 (exclude current year)
  const historicalYears = allYears.filter(
    (y) => y.fiscal_year !== current.fiscal_year
  );

  const enrichedMinistries = current.ministries.map((ministry) => {
    // Same-ministry refs for Rule 3 — built once per ministry, not per project
    const ministryRefs = ministryProjectsMap.get(ministry.id) ?? [];

    return {
    ...ministry,
    departments: ministry.departments.map((dept) => {
      // Rule 4 flags for this department (keyed by project ID)
      const ratioFlags = ruleRatioAnomaly(dept, historicalYears, current.fiscal_year);

      return {
        ...dept,
        projects: dept.projects.map((project) => {
          const flags: RedFlag[] = [];

          const r1 = ruleUnusualIncrease(project);
          if (r1) flags.push(r1);

          const r2 = ruleStatisticalOutlier(
            project,
            categoryAmountsMap[project.budget_type] ?? []
          );
          if (r2) flags.push(r2);

          const r3 = ruleDuplicate(
            { project, ministryId: ministry.id, departmentId: dept.id },
            ministryRefs
          );
          if (r3) flags.push(r3);

          const r4 = ratioFlags.get(project.id);
          if (r4) flags.push(r4);

          // Escalate to critical if 2+ rules matched
          const finalFlags =
            flags.length >= 2
              ? flags.map((f) => ({ ...f, severity: "critical" as const }))
              : flags;

          return { ...project, flags: finalFlags };
        }),
      };
    }),
    };
  });

  return {
    ...current,
    ministries: enrichedMinistries,
    metadata: {
      ...current.metadata,
      enriched: true,
      enriched_version: CURRENT_ENRICHMENT_VERSION,
    },
  };
}
