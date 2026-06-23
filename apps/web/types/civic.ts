export type BudgetType = "personnel" | "operating" | "investment" | "other";
export type FlagRule = "unusual_increase" | "statistical_outlier" | "duplicate" | "ratio_anomaly";
export type FlagSeverity = "critical" | "warning";
export type ColorCategory = "purple" | "amber" | "teal" | "coral" | "gray";

export interface StatisticalContext {
  previous_avg_5yr: number;
  std_deviations?: number;
  threshold_pct?: number;
  match_score?: number;
  matched_project_id?: string;
  matched_project_name?: string;
  category_avg_multiple?: number;
}

export interface RedFlag {
  rule: FlagRule;
  severity: FlagSeverity;
  label: string;
  description: string;
  statistical_context?: StatisticalContext;
}

export interface BudgetHistory {
  year: string;
  amount: number;
}

export interface BudgetProject {
  id: string;
  name: string;
  amount: number;
  previous_amount: number;
  change_pct: number;
  budget_type: BudgetType;
  /** Raw Thai category text from categoryLv1 (e.g. "งบบุคลากร", "งบดำเนินงาน").
   *  More descriptive than the normalised budget_type enum. Optional because
   *  older JSON files may not have this field. */
  category_name?: string;
  /** Line items (ITEM_DESCRIPTION / "ชื่อรายการ") rolled up from the source
   *  rows — the numbered "(1) ... (2) ..." sub-items shown in the source PDF,
   *  each with its summed budget. Optional/absent for rows without an item
   *  description and for older JSON files built before this field existed. */
  items?: { name: string; amount: number }[];
  province: string;
  plan_name: string;
  flags: RedFlag[];
  history: BudgetHistory[];
}

export interface BudgetDepartment {
  id: string;
  name: string;
  budget: number;
  projects: BudgetProject[];
}

export interface BudgetMinistry {
  id: string;
  name: string;
  budget: number;
  color_category: ColorCategory;
  departments: BudgetDepartment[];
}

export interface CivicBudgetYear {
  fiscal_year: string;
  total_budget: number;
  ministries: BudgetMinistry[];
  metadata: {
    source: string;
    parsed_at: string;
    rules_version: string;
    /** Set to true by enrichWithRedFlags. Absent on files written before the
     *  enrichment-at-ETL change → getBudgetYear() auto-migrates on first load. */
    enriched?: boolean;
    /** Matches CURRENT_ENRICHMENT_VERSION from civic-red-flags.ts.
     *  If absent or mismatched, getBudgetYear() re-enriches the file so rule
     *  changes (thresholds, labels, nan-filtering) propagate without re-upload. */
    enriched_version?: string;
  };
}

// Derived/computed types used in API responses

export interface MinistryListItem {
  id: string;
  name: string;
  budget: number;
  percentage: number;
  departmentCount: number;
  projectCount: number;
  redFlagCount: number;
  colorCategory: ColorCategory;
}

export interface DepartmentListItem {
  id: string;
  name: string;
  budget: number;
  projectCount: number;
  redFlagCount: number;
}

export interface ProjectListItem {
  id: string;
  name: string;
  ministryId: string;
  ministryName: string;
  departmentId: string;
  departmentName: string;
  amount: number;
  previousAmount: number;
  changePct: number;
  budgetType: BudgetType;
  province: string;
  flags: { severity: FlagSeverity; label: string }[];
}

export interface ProjectDetail extends BudgetProject {
  ministry: { id: string; name: string };
  department: { id: string; name: string };
  relatedProjects: {
    id: string;
    name: string;
    amount: number;
    changePct: number;
    flagSeverity?: FlagSeverity;
  }[];
  source: {
    name: string;
    section: string;
  };
}

export interface MinistryWithDepts extends MinistryListItem {
  /** Department-level summaries — used by MinistryTreemap for drill-down view */
  departments: DepartmentListItem[];
}

// ─── Drill-down types for Treemap level 3 and Sunburst level 2 ───────────────

/** Minimal project summary returned by /api/civic/dept-projects (lazy-loaded) */
export interface ProjectSummary {
  id: string;
  name: string;
  amount: number;
  budgetType: BudgetType;
  hasFlag: boolean;
  /** First (most severe) flag details — present when hasFlag=true */
  firstFlag?: { severity: FlagSeverity; label: string };
}

/** Budget split by expenditure type — 4 categories, sums to dept.budget */
export interface BudgetTypeBreakdown {
  personnel: number;  // งบบุคลากร
  operating: number;  // งบดำเนินงาน
  investment: number; // งบลงทุน
  other: number;      // รายจ่ายอื่น
}

/** Department with expenditure-type breakdown for Sunburst level-2 drill-down */
export interface DepartmentWithProjects extends DepartmentListItem {
  budgetTypes: BudgetTypeBreakdown;
}

/** Ministry with full dept breakdown — used by Treemap and Sunburst */
export interface MinistryWithFullData extends MinistryListItem {
  departments: DepartmentWithProjects[];
}

export interface BudgetYearSummary {
  fiscalYear: string;
  totalBudget: number;
  ministryCount: number;
  projectCount: number;
  redFlagCount: number;
  ministries: MinistryListItem[];
  /** Full ministry + dept breakdown (with budget type amounts) for drill-down */
  ministriesWithDepts: MinistryWithFullData[];
}

export interface SearchResult {
  total: number;
  page: number;
  limit: number;
  stats: {
    totalAmount: number;
    redFlagCount: number;
    avgIncreasePct: number;
    newProjectCount: number;
    // Composition of the *current* search/filter results by budget type —
    // powers the category breakdown bar so users can see at a glance what
    // kind of spending their search/filter is surfacing.
    categoryBreakdown: { budgetType: BudgetType; amount: number; percentage: number }[];
    // Frequent keywords found in project names within the *current*
    // search/filter results — powers the "KeywordBudget" view.
    keywords: { keyword: string; count: number }[];
  };
  results: ProjectListItem[];
}

export interface SearchFilters {
  q?: string;
  ministries?: string[];
  budgetTypes?: BudgetType[];
  minAmount?: number;
  maxAmount?: number;
  status?: string[];
  year?: string;
  sort?: "amount_desc" | "amount_asc" | "change_desc" | "name_asc";
  page?: number;
  limit?: number;
}
