import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import type {
  CivicBudgetYear,
  BudgetMinistry,
  BudgetProject,
  BudgetDepartment,
  MinistryListItem,
  DepartmentListItem,
  DepartmentWithProjects,
  MinistryWithFullData,
  BudgetTypeBreakdown,
  ProjectListItem,
  ProjectSummary,
  SearchFilters,
  BudgetType,
} from "@/types/civic";
// enrichWithRedFlags is imported ONLY for auto-migration of JSON files that
// either pre-date the enrichment-at-ETL change or were enriched with an older
// rule version. Normal cache loads are just JSON.parse + cache.set — no O(n²)
// Rule 3 on every cold start.
import { enrichWithRedFlags, CURRENT_ENRICHMENT_VERSION } from "@/lib/civic-red-flags";

const cache = new Map<string, CivicBudgetYear>();
// Tracks years currently being written back during auto-migration so two
// simultaneous cold-start requests don't both try to write the same file.
const migrating = new Set<string>();

const DATA_DIR = path.join(process.cwd(), "data");

function loadRawYear(year: string): CivicBudgetYear | null {
  const filePath = path.join(DATA_DIR, `budget-${year}.json`);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as CivicBudgetYear;
  } catch {
    return null;
  }
}

export function getBudgetYear(year: string): CivicBudgetYear | null {
  if (cache.has(year)) return cache.get(year)!;

  const data = loadRawYear(year);
  if (!data) return null;

  // ── Auto-migration: re-enrich files that are unenriched or on stale rules ──
  // Triggered by:
  //   1. metadata.enriched absent  → file pre-dates enrichment-at-ETL change
  //   2. enriched_version mismatch → rule thresholds/labels/logic changed
  //      (e.g. v1.0 had no nan-filtering or ฿1M guard; v1.1 adds both)
  // Runs once per file on first access, writes back async so subsequent starts
  // are instant. This is the only time enrichment runs in this module; all new
  // uploads will have the current version stamped by buildAndPersistCivicYear.
  const needsMigration =
    !data.metadata.enriched ||
    data.metadata.enriched_version !== CURRENT_ENRICHMENT_VERSION;

  if (needsMigration) {
    const reason = !data.metadata.enriched
      ? "unenriched"
      : `stale rules (${data.metadata.enriched_version ?? "none"} → ${CURRENT_ENRICHMENT_VERSION})`;
    console.log(`[civic-cache] Migrating year ${year} (${reason})…`);
    // Load the previous year as historical context (may be null — that's fine)
    const prevYear = String(Number(year) - 1);
    const prevData = prevYear !== year ? loadRawYear(prevYear) : null;
    const historicalYears: CivicBudgetYear[] = prevData ? [prevData] : [];
    const enriched = enrichWithRedFlags(data, [data, ...historicalYears]);
    // Write back asynchronously — don't block the first page load.
    // Guard with `migrating` set so concurrent cold-start requests don't both
    // try to write the same file at the same time.
    const filePath = path.join(DATA_DIR, `budget-${year}.json`);
    if (!migrating.has(year)) {
      migrating.add(year);
      fsPromises
        .writeFile(filePath, JSON.stringify(enriched, null, 2), "utf-8")
        .then(() => migrating.delete(year))
        .catch((err) => {
          migrating.delete(year);
          console.error(`[civic-cache] Failed to write migrated file for ${year}:`, err);
        });
    }
    cache.set(year, enriched);
    return enriched;
  }

  // Flags already baked in by the ETL pipeline at the current rule version — cache as-is.
  cache.set(year, data);
  return data;
}

export function getAvailableYears(): string[] {
  try {
    return fs
      .readdirSync(DATA_DIR)
      .filter((f) => f.startsWith("budget-") && f.endsWith(".json"))
      .map((f) => f.replace("budget-", "").replace(".json", ""))
      .sort();
  } catch {
    return ["2568"];
  }
}

export function computeMinistryList(data: CivicBudgetYear): MinistryListItem[] {
  return data.ministries.map((m) => {
    const projectCount = m.departments.reduce(
      (sum, d) => sum + d.projects.length,
      0
    );
    const redFlagCount = m.departments.reduce(
      (sum, d) =>
        sum + d.projects.reduce((s2, p) => s2 + (p.flags.length > 0 ? 1 : 0), 0),
      0
    );
    return {
      id: m.id,
      name: m.name,
      budget: m.budget,
      percentage: (m.budget / data.total_budget) * 100,
      departmentCount: m.departments.length,
      projectCount,
      redFlagCount,
      colorCategory: m.color_category,
    };
  });
}

/**
 * Compute ministry summaries with department-level breakdowns including budget
 * type amounts (personnel / operating / investment / other).
 * Used by Treemap drill-down and Sunburst chart level-2 view.
 */
export function computeMinistryWithDepts(data: CivicBudgetYear): MinistryWithFullData[] {
  const ministries = computeMinistryList(data);
  return ministries.map((m) => {
    const raw = data.ministries.find((rm) => rm.id === m.id);
    const departments: DepartmentWithProjects[] = (raw?.departments ?? []).map((d) => {
      const budgetTypes: BudgetTypeBreakdown = { personnel: 0, operating: 0, investment: 0, other: 0 };
      for (const p of d.projects) {
        budgetTypes[p.budget_type] = (budgetTypes[p.budget_type] ?? 0) + p.amount;
      }
      return {
        id: d.id,
        name: d.name,
        budget: d.budget,
        projectCount: d.projects.length,
        redFlagCount: d.projects.reduce((s, p) => s + (p.flags.length > 0 ? 1 : 0), 0),
        budgetTypes,
      };
    });
    return { ...m, departments };
  });
}

/** Project name filter — exclude aggregates / unnamed rows */
const NAN_NAMES = new Set(["nan", "none", "null", "(ไม่ระบุชื่อโครงการ)"]);
export function isNamedProject(name: string): boolean {
  return !!name && !NAN_NAMES.has(name.trim().toLowerCase()) && name.trim().length >= 3;
}

/**
 * Return top-N named projects for a specific department (sorted by amount desc).
 * Used by /api/civic/dept-projects to lazy-load treemap level 3.
 */
export function getDeptProjects(
  data: CivicBudgetYear,
  ministryId: string,
  deptId: string,
  limit = 50
): ProjectSummary[] {
  const ministry = data.ministries.find((m) => m.id === ministryId);
  const dept = ministry?.departments.find((d) => d.id === deptId);
  if (!dept) return [];
  return dept.projects
    .filter((p) => isNamedProject(p.name))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((p) => {
      // Pick most severe flag first (critical > warning)
      const sortedFlags = [...p.flags].sort((a, b) =>
        a.severity === "critical" && b.severity !== "critical" ? -1 : 1
      );
      const top = sortedFlags[0];
      return {
        id: p.id,
        name: p.name,
        amount: p.amount,
        budgetType: p.budget_type,
        hasFlag: p.flags.length > 0,
        firstFlag: top ? { severity: top.severity, label: top.label } : undefined,
      };
    });
}

export function computeTotalRedFlags(data: CivicBudgetYear): number {
  return data.ministries.reduce(
    (sum, m) =>
      sum +
      m.departments.reduce(
        (s2, d) =>
          s2 + d.projects.reduce((s3, p) => s3 + (p.flags.length > 0 ? 1 : 0), 0),
        0
      ),
    0
  );
}

export function computeProjectCount(data: CivicBudgetYear): number {
  return data.ministries.reduce(
    (sum, m) =>
      sum + m.departments.reduce((s2, d) => s2 + d.projects.length, 0),
    0
  );
}

export function getAllProjects(data: CivicBudgetYear): ProjectListItem[] {
  const results: ProjectListItem[] = [];
  for (const ministry of data.ministries) {
    for (const dept of ministry.departments) {
      for (const project of dept.projects) {
        results.push({
          id: project.id,
          name: project.name,
          ministryId: ministry.id,
          ministryName: ministry.name,
          departmentId: dept.id,
          departmentName: dept.name,
          amount: project.amount,
          previousAmount: project.previous_amount,
          changePct: project.change_pct,
          budgetType: project.budget_type,
          province: project.province,
          flags: project.flags.map((f) => ({
            severity: f.severity,
            label: f.label,
          })),
        });
      }
    }
  }
  return results;
}

// Maps natural-language / Thai category keywords to underlying data fields so
// a free-text search like "งบบุคลากรกระทรวงสาธารณสุข" or "โครงการที่ถูกตั้งธงแดง"
// finds results by *meaning* (budget type / red-flag status), not just literal
// substrings in the project name. Each query is split into tokens; a project
// matches if ANY token matches ANY field — letting users type loose phrases
// ("ค้นหาด้วยประโยคหรือคำ") instead of exact project names.
const BUDGET_TYPE_KEYWORDS: Record<BudgetType, string[]> = {
  personnel: ["บุคลากร", "เงินเดือน", "ค่าจ้าง", "บุคคล", "personnel"],
  operating: ["ดำเนินงาน", "operating", "ปฏิบัติการ"],
  investment: [
    "ลงทุน",
    "ครุภัณฑ์",
    "ก่อสร้าง",
    "ที่ดินและสิ่งก่อสร้าง",
    "วัสดุ",
    "investment",
  ],
  other: ["อื่นๆ", "other"],
};

const FLAG_KEYWORDS = ["ธงแดง", "ผิดปกติ", "red flag", "ซ้ำซ้อน", "เพิ่มผิดปกติ"];
const INCREASE_KEYWORDS = ["เพิ่มขึ้น", "เพิ่ม", "พุ่ง", "โต"];

function matchesBudgetType(token: string, budgetType: BudgetType): boolean {
  return BUDGET_TYPE_KEYWORDS[budgetType].some((kw) => token.includes(kw) || kw.includes(token));
}

export function searchProjects(
  data: CivicBudgetYear,
  filters: SearchFilters
): ProjectListItem[] {
  let projects = getAllProjects(data);

  if (filters.q) {
    // Split the query into tokens so a multi-word phrase ("สาธารณสุข วัคซีน")
    // matches projects that satisfy any of the words across any of the fields.
    const tokens = filters.q
      .toLowerCase()
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (tokens.length > 0) {
      projects = projects.filter((p) => {
        const haystacks = [
          p.name.toLowerCase(),
          p.ministryName.toLowerCase(),
          p.departmentName.toLowerCase(),
          p.province.toLowerCase(),
          ...p.flags.map((f) => f.label.toLowerCase()),
        ];

        return tokens.some((token) => {
          if (haystacks.some((h) => h.includes(token))) return true;
          if (matchesBudgetType(token, p.budgetType)) return true;
          if (FLAG_KEYWORDS.some((kw) => token.includes(kw) || kw.includes(token))) {
            return p.flags.length > 0;
          }
          if (INCREASE_KEYWORDS.some((kw) => token.includes(kw) || kw.includes(token))) {
            return p.changePct > 0;
          }
          return false;
        });
      });
    }
  }

  if (filters.ministries && filters.ministries.length > 0) {
    projects = projects.filter((p) =>
      filters.ministries!.includes(p.ministryId)
    );
  }

  if (filters.budgetTypes && filters.budgetTypes.length > 0) {
    projects = projects.filter((p) =>
      filters.budgetTypes!.includes(p.budgetType)
    );
  }

  if (filters.minAmount !== undefined) {
    projects = projects.filter((p) => p.amount >= filters.minAmount!);
  }

  if (filters.maxAmount !== undefined) {
    projects = projects.filter((p) => p.amount <= filters.maxAmount!);
  }

  if (filters.status && filters.status.length > 0) {
    projects = projects.filter((p) => {
      if (filters.status!.includes("red_flag") && p.flags.length > 0) return true;
      if (filters.status!.includes("increased_50") && p.changePct >= 50) return true;
      if (
        filters.status!.includes("duplicate") &&
        p.flags.some((f) =>
          f.label.toLowerCase().includes("ซ้ำ")
        )
      )
        return true;
      return false;
    });
  }

  switch (filters.sort) {
    case "amount_asc":
      projects.sort((a, b) => a.amount - b.amount);
      break;
    case "change_desc":
      projects.sort((a, b) => b.changePct - a.changePct);
      break;
    case "name_asc":
      projects.sort((a, b) => a.name.localeCompare(b.name, "th"));
      break;
    case "amount_desc":
    default:
      projects.sort((a, b) => b.amount - a.amount);
  }

  return projects;
}

export function findProject(
  data: CivicBudgetYear,
  projectId: string
): {
  project: BudgetProject;
  ministry: BudgetMinistry;
  department: BudgetDepartment;
} | null {
  for (const ministry of data.ministries) {
    for (const dept of ministry.departments) {
      const project = dept.projects.find((p) => p.id === projectId);
      if (project) return { project, ministry, department: dept };
    }
  }
  return null;
}

export function invalidateYear(year: string): void {
  cache.delete(year);
}

/**
 * Find projects related to the given one, scored by how closely they match
 * across four signals:
 *   +3  same แผนงาน (plan_name) — strongest indicator of programmatic overlap
 *   +2  same budget_type — same expenditure category
 *   +1  same province (when non-empty) — geographic co-location
 *   +1  both have red flags — surfaced together for civic scrutiny
 *
 * Only named projects (not "nan" aggregates) within the same ministry
 * qualify. Results are sorted by score desc and capped at `limit`.
 */
// ─── Province data ───────────────────────────────────────────────────────────

export interface ProvinceData {
  province: string;
  budget: number;
  projectCount: number;
  redFlagCount: number;
}

/** Aggregate project budgets by province.
 *  "ทั่วประเทศ" (nationwide) is kept as a separate entry — callers can
 *  choose to display or exclude it. Provinces with empty/unknown names
 *  are bucketed under "ไม่ระบุ".
 */
export function getProvinceData(data: CivicBudgetYear): ProvinceData[] {
  const byProvince = new Map<string, ProvinceData>();

  for (const ministry of data.ministries) {
    for (const dept of ministry.departments) {
      for (const project of dept.projects) {
        const raw = project.province?.trim() || "ไม่ระบุ";
        let entry = byProvince.get(raw);
        if (!entry) {
          entry = { province: raw, budget: 0, projectCount: 0, redFlagCount: 0 };
          byProvince.set(raw, entry);
        }
        entry.budget += project.amount;
        entry.projectCount += 1;
        if (project.flags.length > 0) entry.redFlagCount += 1;
      }
    }
  }

  return Array.from(byProvince.values()).sort((a, b) => b.budget - a.budget);
}

export function getRelatedProjects(
  data: CivicBudgetYear,
  project: BudgetProject,
  ministryId: string,
  limit = 4
) {
  const NAN_NAMES = new Set(["nan", "none", "null", "(ไม่ระบุชื่อโครงการ)"]);
  const isNamed = (name: string) =>
    !!name && !NAN_NAMES.has(name.trim().toLowerCase()) && name.trim().length >= 3;

  const scored: Array<{ item: ProjectListItem; score: number }> = [];

  for (const ministry of data.ministries) {
    if (ministry.id !== ministryId) continue;
    for (const dept of ministry.departments) {
      for (const p of dept.projects) {
        if (p.id === project.id) continue;
        if (!isNamed(p.name)) continue;

        let score = 0;
        if (p.plan_name && p.plan_name === project.plan_name) score += 3;
        if (p.budget_type === project.budget_type) score += 2;
        if (p.province && p.province === project.province) score += 1;
        if (p.flags.length > 0 && project.flags.length > 0) score += 1;

        if (score === 0) continue; // no signal — don't include

        scored.push({
          score,
          item: {
            id: p.id,
            name: p.name,
            ministryId: ministry.id,
            ministryName: ministry.name,
            departmentId: dept.id,
            departmentName: dept.name,
            amount: p.amount,
            previousAmount: p.previous_amount,
            changePct: p.change_pct,
            budgetType: p.budget_type,
            province: p.province,
            flags: p.flags.map((f) => ({ severity: f.severity, label: f.label })),
          },
        });
      }
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}
