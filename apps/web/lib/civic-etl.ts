/**
 * ETL: BudgetLineItemRow[] → CivicBudgetYear tree → data/budget-{year}.json
 *
 * Groups raw line items (ministry → budgetaryUnit → output|project) into the
 * nested BudgetMinistry/Department/Project shape, enriches projects with red-flag
 * detection, writes the enriched output JSON file (source-of-truth per CLAUDE.md),
 * then invalidates the in-memory cache so the next read picks up the new data.
 *
 * Enrichment is done HERE (at upload/ETL time) and stored in the JSON so that
 * getBudgetYear() / cache loads are just a JSON.parse + cache.set — no expensive
 * O(n²) Rule 3 computation on every cold-start or cache invalidation.
 */

import fs from "fs/promises";
import path from "path";
import type {
  CivicBudgetYear,
  BudgetMinistry,
  BudgetDepartment,
  BudgetProject,
  BudgetType,
  ColorCategory,
} from "@/types/civic";
import { getBudgetYear, invalidateYear } from "@/lib/civic-cache";
import { enrichWithRedFlags } from "@/lib/civic-red-flags";

// Raw row shape expected from the parser (mirrors BudgetLineItemRow in Python)
export interface EtlRow {
  refDoc: string;
  refPageNo?: number;
  ministry: string;
  budgetaryUnit: string;
  budgetPlan: string;
  output?: string | null;
  project?: string | null;
  categoryLv1?: string | null;
  categoryLv2?: string | null;
  categoryLv3?: string | null;
  categoryLv4?: string | null;
  categoryLv5?: string | null;
  categoryLv6?: string | null;
  itemDescription?: string | null;
  fiscalYear: number;
  amount: number;
  strategy?: string | null;
  motherPlan?: string | null;
  crossFunc?: boolean;
  obliged?: boolean;
}

const COLOR_CYCLE: ColorCategory[] = ["purple", "amber", "teal", "coral", "gray"];

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^฀-๿a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 30);
}

function categoryToBudgetType(cat: string | null | undefined): BudgetType {
  if (!cat) return "other";
  if (cat.includes("บุคลากร")) return "personnel";
  if (cat.includes("ดำเนินงาน")) return "operating";
  if (cat.includes("ลงทุน") || cat.includes("ครุภัณฑ์") || cat.includes("ก่อสร้าง")) return "investment";
  return "other";
}

/** Pandas NaN cells survive as the string "nan" through the parser → ETL.
 *  Treat them the same as a missing value so they don't become project names
 *  or pollute red-flag duplicate detection. */
const NAN_STRINGS = new Set(["nan", "none", "null", "nat", "n/a"]);
function isBlank(val: string | null | undefined): boolean {
  return !val || NAN_STRINGS.has(val.trim().toLowerCase());
}

interface ProjectAccum {
  amount: number;
  catAmounts: Map<string, number>; // categoryLv1 → summed amount — used to pick dominant type
  plan: string;
  projectName: string;
  itemAmounts: Map<string, number>; // itemDescription ("ชื่อรายการ") → summed amount, insertion-ordered
}

type ProjectKey = string; // "ministry|||dept|||projectName"

export async function buildAndPersistCivicYear(
  rows: EtlRow[],
  fiscalYear: number,
  source: string
): Promise<CivicBudgetYear> {
  const yearStr = String(fiscalYear);
  const prevYearStr = String(fiscalYear - 1);

  // Previous year's data for changePct / history — can be null for the first import
  const previousData = getBudgetYear(prevYearStr);
  const prevAmounts = new Map<string, number>();
  if (previousData) {
    for (const m of previousData.ministries) {
      for (const d of m.departments) {
        for (const p of d.projects) {
          prevAmounts.set(p.name, p.amount);
        }
      }
    }
  }

  // ── Group rows: ministry → dept → project ────────────────────────────────
  const ministryOrder: string[] = [];
  const ministryDeptOrder = new Map<string, string[]>(); // ministry → ordered dept names
  const deptProjectOrder = new Map<string, string[]>();  // "ministry|||dept" → ordered project names
  const projectAccum = new Map<ProjectKey, ProjectAccum>();

  for (const row of rows) {
    // Use first non-blank of project → output → budgetPlan; treat "nan" strings
    // (pandas NaN residue) as blank so they don't become real project names.
    const projectName =
      (!isBlank(row.project) ? row.project : null) ??
      (!isBlank(row.output) ? row.output : null) ??
      (!isBlank(row.budgetPlan) ? row.budgetPlan : null) ??
      "(ไม่ระบุชื่อโครงการ)";
    const key: ProjectKey = `${row.ministry}|||${row.budgetaryUnit}|||${projectName}`;
    const deptKey = `${row.ministry}|||${row.budgetaryUnit}`;

    if (!projectAccum.has(key)) {
      // Track insertion order so the tree preserves the original document order
      if (!ministryOrder.includes(row.ministry)) {
        ministryOrder.push(row.ministry);
        ministryDeptOrder.set(row.ministry, []);
      }
      const depts = ministryDeptOrder.get(row.ministry)!;
      if (!depts.includes(row.budgetaryUnit)) {
        depts.push(row.budgetaryUnit);
        deptProjectOrder.set(deptKey, []);
      }
      deptProjectOrder.get(deptKey)!.push(projectName);

      projectAccum.set(key, {
        amount: 0,
        catAmounts: new Map(),
        plan: row.budgetPlan,
        projectName,
        itemAmounts: new Map(),
      });
    }

    const acc = projectAccum.get(key)!;
    acc.amount += row.amount;
    const cat = row.categoryLv1 || "อื่นๆ";
    acc.catAmounts.set(cat, (acc.catAmounts.get(cat) ?? 0) + row.amount);

    // ITEM_DESCRIPTION ("ชื่อรายการ") — the numbered "(1) ... (2) ..." sub-items
    // shown under a project in the source PDF. Not every row has one; the same
    // item name can span multiple rows, so sum their amounts. Map preserves
    // first-seen order.
    if (!isBlank(row.itemDescription)) {
      const item = row.itemDescription!.trim();
      acc.itemAmounts.set(item, (acc.itemAmounts.get(item) ?? 0) + row.amount);
    }
  }

  // ── Build tree ────────────────────────────────────────────────────────────
  // slugify() truncates to 30 chars, so distinct long names (e.g. two
  // similarly-worded projects in the same department) can collide on the
  // same slug. Track every id handed out and suffix "-2", "-3", ... on
  // collision so ids stay unique (used as React keys and DB primary keys).
  const usedIds = new Set<string>();
  function uniqueId(base: string): string {
    if (!usedIds.has(base)) {
      usedIds.add(base);
      return base;
    }
    let i = 2;
    while (usedIds.has(`${base}-${i}`)) i++;
    const id = `${base}-${i}`;
    usedIds.add(id);
    return id;
  }

  const ministries: BudgetMinistry[] = [];
  let colorIdx = 0;

  for (const ministryName of ministryOrder) {
    const ministrySlug = slugify(ministryName);
    const deptNames = ministryDeptOrder.get(ministryName) ?? [];
    const departments: BudgetDepartment[] = [];
    let ministryTotal = 0;

    for (const deptName of deptNames) {
      const deptSlug = slugify(deptName);
      const deptKey = `${ministryName}|||${deptName}`;
      const projectNames = deptProjectOrder.get(deptKey) ?? [];
      const projects: BudgetProject[] = [];
      let deptTotal = 0;

      for (const projectName of projectNames) {
        const key: ProjectKey = `${ministryName}|||${deptName}|||${projectName}`;
        const acc = projectAccum.get(key);
        if (!acc) continue;

        // Pick dominant budget_type by highest accumulated category amount
        let dominantCat: string | undefined;
        let dominantAmt = -1;
        for (const [cat, amt] of acc.catAmounts) {
          if (amt > dominantAmt) {
            dominantAmt = amt;
            dominantCat = cat;
          }
        }

        const prevAmount = prevAmounts.get(projectName) ?? 0;
        const changePct =
          prevAmount > 0 ? Math.round(((acc.amount - prevAmount) / prevAmount) * 10000) / 100 : 0;

        const projectSlug = slugify(projectName);
        // Preserve the raw dominant category text (e.g. "งบบุคลากร") alongside
        // the normalised BudgetType enum — it adds human-readable context to the
        // detail page and to red-flag descriptions.
        const categoryName = (!isBlank(dominantCat) ? dominantCat : null) ?? undefined;
        projects.push({
          id: uniqueId(`p-${ministrySlug}-${deptSlug}-${projectSlug}`),
          name: projectName,
          amount: acc.amount,
          previous_amount: prevAmount,
          change_pct: changePct,
          budget_type: categoryToBudgetType(dominantCat),
          category_name: categoryName,
          items:
            acc.itemAmounts.size > 0
              ? Array.from(acc.itemAmounts, ([name, amount]) => ({ name, amount }))
              : undefined,
          province: "",
          plan_name: acc.plan,
          flags: [],
          history: prevAmount > 0 ? [{ year: prevYearStr, amount: prevAmount }] : [],
        });
        deptTotal += acc.amount;
      }

      // Sort projects by amount descending within dept
      projects.sort((a, b) => b.amount - a.amount);

      departments.push({
        id: uniqueId(`d-${ministrySlug}-${deptSlug}`),
        name: deptName,
        budget: deptTotal,
        projects,
      });
      ministryTotal += deptTotal;
    }

    departments.sort((a, b) => b.budget - a.budget);

    ministries.push({
      id: uniqueId(`m-${ministrySlug}`),
      name: ministryName,
      budget: ministryTotal,
      color_category: COLOR_CYCLE[colorIdx % COLOR_CYCLE.length],
      departments,
    });
    colorIdx++;
  }

  ministries.sort((a, b) => b.budget - a.budget);

  const totalBudget = ministries.reduce((s, m) => s + m.budget, 0);

  const civicYear: CivicBudgetYear = {
    fiscal_year: yearStr,
    total_budget: totalBudget,
    ministries,
    metadata: {
      source,
      parsed_at: new Date().toISOString(),
      rules_version: "1.0",
    },
  };

  // ── Enrich with red flags (done once here, baked into JSON) ─────────────
  // Load available historical years for Rules 3 & 4. prevYear is already in
  // memory from the changePct lookup above; pass it as historical context.
  // enrichWithRedFlags is synchronous and O(n²/m) after the Rule 3 optimisation
  // in civic-red-flags.ts — acceptable for an admin upload operation.
  const historicalYears: CivicBudgetYear[] = [];
  if (previousData) historicalYears.push(previousData);
  const enrichedYear = enrichWithRedFlags(civicYear, [civicYear, ...historicalYears]);

  // ── Write JSON (source-of-truth) and invalidate in-memory cache ───────────
  const dataDir = path.join(process.cwd(), "data");
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, `budget-${yearStr}.json`),
    JSON.stringify(enrichedYear, null, 2),
    "utf-8"
  );

  invalidateYear(yearStr);

  return enrichedYear;
}

/** Count red-flagged projects in a built CivicBudgetYear. */
export function countRedFlags(data: CivicBudgetYear): number {
  return data.ministries.reduce(
    (s, m) =>
      s +
      m.departments.reduce(
        (s2, d) => s2 + d.projects.filter((p) => p.flags.length > 0).length,
        0
      ),
    0
  );
}
