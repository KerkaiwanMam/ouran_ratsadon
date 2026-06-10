import type { User, Subscription, FileRecord, ReportSummary, LeakReport } from "@/types";
import type {
  BudgetYearSummary,
  SearchResult,
  SearchFilters,
  ProjectDetail,
} from "@/types/civic";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "เกิดข้อผิดพลาด" }));
    throw new Error(error.message ?? "เกิดข้อผิดพลาด");
  }
  return res.json();
}

// ─── Civic Layer ─────────────────────────────────────────────────────────────

function buildSearchParams(filters: SearchFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.year) p.set("year", filters.year);
  if (filters.sort) p.set("sort", filters.sort);
  if (filters.page) p.set("page", String(filters.page));
  if (filters.limit) p.set("limit", String(filters.limit));
  filters.ministries?.forEach((m) => p.append("ministries[]", m));
  filters.budgetTypes?.forEach((t) => p.append("budgetTypes[]", t));
  filters.status?.forEach((s) => p.append("status[]", s));
  if (filters.minAmount !== undefined) p.set("minAmount", String(filters.minAmount));
  if (filters.maxAmount !== undefined) p.set("maxAmount", String(filters.maxAmount));
  return p;
}

export const civic = {
  years: () =>
    request<{ years: string[]; current: string; last_updated: string | null }>(
      "/api/civic/years"
    ),

  budget: (year: string) =>
    request<BudgetYearSummary>(`/api/civic/budget/${year}`),

  search: (filters: SearchFilters) =>
    request<SearchResult>(
      `/api/civic/search?${buildSearchParams(filters)}`
    ),

  project: (id: string, year?: string) =>
    request<ProjectDetail>(
      `/api/civic/project/${id}${year ? `?year=${year}` : ""}`
    ),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  me: () =>
    request<{ user: User; subscription: Subscription | null }>("/api/auth/me"),

  login: (email: string, password: string) =>
    request<{ user: User; subscription: Subscription | null }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  logout: () => request("/api/auth/logout", { method: "POST" }),
};

// ─── Business Layer — Files ───────────────────────────────────────────────────

export const files = {
  list: () => request<{ total: number; files: FileRecord[] }>("/api/files"),

  upload: (formData: FormData) =>
    fetch("/api/files/upload", { method: "POST", body: formData }).then(
      async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "อัปโหลดไม่สำเร็จ");
        return data as { file: FileRecord };
      }
    ),

  delete: (id: string) => request(`/api/files/${id}`, { method: "DELETE" }),
};

// ─── Business Layer — Reports ─────────────────────────────────────────────────

export const reports = {
  summary: (fileId: string) =>
    request<ReportSummary>(`/api/report/${fileId}/summary`),

  leaks: (fileId: string) =>
    request<LeakReport>(`/api/report/${fileId}/leaks`),
};

// ─── Subscription ─────────────────────────────────────────────────────────────

export const subscription = {
  get: () => request<Subscription>("/api/subscription"),
  checkout: (plan: "PRO" | "TEAM", billing: "monthly" | "yearly") =>
    request<{ checkout_url: string }>("/api/subscription/checkout", {
      method: "POST",
      body: JSON.stringify({ plan, billing }),
    }),
  cancel: () => request("/api/subscription/cancel", { method: "POST" }),
};
