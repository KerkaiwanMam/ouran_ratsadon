import type { BudgetData, FileMetadata, User } from "@/types";

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

export const api = {
  auth: {
    me: () => request<{ user: User }>("/api/auth/me"),
    login: (email: string, password: string) =>
      request<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request("/api/auth/logout", { method: "POST" }),
  },

  files: {
    list: () => request<{ files: FileMetadata[] }>("/api/files"),
    get: (id: string) => request<FileMetadata>(`/api/files/${id}`),
    delete: (id: string) => request(`/api/files/${id}`, { method: "DELETE" }),
  },

  budget: {
    get: (fileId: string) => request<BudgetData>(`/api/budget/${fileId}`),
    summary: (fileId: string) => request(`/api/budget/${fileId}/summary`),
    anomalies: (fileId: string) => request(`/api/budget/${fileId}/anomalies`),
  },

  subscription: {
    get: () => request("/api/subscription"),
    checkout: () => request("/api/subscription/checkout", { method: "POST" }),
    cancel: () => request("/api/subscription/cancel", { method: "POST" }),
  },
};
