export type UserRole = "guest" | "member" | "pro" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface FileMetadata {
  id: string;
  filename: string;
  fileType: "pdf" | "xlsx";
  status: "processing" | "done" | "error";
  uploadedAt: string;
  fiscalYear?: string;
  organization?: string;
}

export type AnomalyFlag = "none" | "warning" | "critical";

export interface BudgetItem {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string | null;
  anomalyFlag: AnomalyFlag;
  anomalyReason: string | null;
}

export interface BudgetCategory {
  name: string;
  budget: number;
  spent: number;
  percentage: number;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  categories: BudgetCategory[];
}

export interface BudgetData {
  metadata: FileMetadata & {
    parsedAt: string;
    totalItems: number;
  };
  summary: BudgetSummary;
  items: BudgetItem[];
}
