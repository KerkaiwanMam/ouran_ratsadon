// Business Layer types (SME financial analysis)
// Civic Layer types are in types/civic.ts

export type UserRole = "MEMBER" | "ADMIN";
export type Plan = "FREE" | "PRO" | "TEAM";
export type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "EXPIRED" | "TRIAL";
export type FileStatus = "UPLOADING" | "PROCESSING" | "DONE" | "ERROR";
export type SourceFormat =
  | "EXCEL_TEMPLATE"
  | "BANK_SCB"
  | "BANK_KBANK"
  | "BANK_BBL"
  | "PEAK"
  | "FLOWACCOUNT";
export type TxType = "INCOME" | "EXPENSE";
export type LeakFlag = "NONE" | "SPIKE" | "DUPLICATE" | "OUTLIER" | "CREEP";
export type LeakSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  organization?: string;
  createdAt: string;
}

export interface Subscription {
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  trialEndsAt?: string;
}

export interface FileRecord {
  id: string;
  filename: string;
  fileSize: number;
  fileType: string;
  sourceFormat: SourceFormat;
  status: FileStatus;
  errorMessage?: string;
  periodStart?: string;
  periodEnd?: string;
  transactionCount?: number;
  totalIncome?: number;
  totalExpense?: number;
  uploadedAt: string;
  processedAt?: string;
  leakCount?: number;
}

export interface Transaction {
  id: string;
  fileId: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  transactionType: TxType;
  autoCategorized: boolean;
  userOverrode: boolean;
  leakFlag: LeakFlag;
  leakSeverity?: LeakSeverity;
  leakReason?: string;
}

export interface CategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
  trendPct?: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface ReportSummary {
  periodStart: string;
  periodEnd: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrend: MonthlyTrend[];
}

export interface LeakResult {
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  rule: "spike" | "duplicate" | "outlier" | "creep";
  severity: "critical" | "warning";
  reason: string;
  context: Record<string, number | string>;
}

export interface LeakReport {
  total: number;
  byRule: Record<string, number>;
  leaks: LeakResult[];
}
