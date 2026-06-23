// Phase 3 — Conversational AI assistant: governed-context assembler.
//
// THIS IS THE PDPA / anti-hallucination boundary. The assistant must answer
// ONLY from pre-aggregated, governed values (Layer 1 "Shared Truth") — the
// same MonthlyFinancialSummary / DiagnosticInsight / ForecastSnapshot /
// Recommendation sources the dashboard reads. We deliberately assemble a
// compact bundle of *aggregates here and NEVER pass raw Transaction rows to
// the LLM: individual rows are personal financial data and would also let the
// model invent line-item claims it can't ground. Every number the model is
// allowed to cite comes from this bundle.
//
// Keep the bundle small — it's sent on every chat turn, so caps matter for
// both token cost and prompt focus.

import { getDescriptiveSummary } from "@/lib/analytics/summary";
import { getDiagnosticInsights } from "@/lib/analytics/diagnose";
import { getLatestForecastSnapshot } from "@/lib/analytics/predict";
import { getRecommendations } from "@/lib/analytics/recommend";

const MONTHS_WINDOW = 12;       // how many trailing months of rollups to include
const TOP_CATEGORIES = 6;       // per-month category lines (already expense-sorted)
const MAX_DIAGNOSTICS = 10;
const MAX_RECOMMENDATIONS = 8;

const round = (n: number) => Math.round(n);

export interface AssistantContextMonth {
  month: string;            // "YYYY-MM"
  totalIncome: number;
  totalExpense: number;
  net: number;
  topCategories: { category: string; totalExpense: number; txCount: number }[];
}

export interface AssistantContext {
  currency: "THB";
  generatedAt: string;
  /** Sorted ascending. Empty array → the user has no transactions yet. */
  months: AssistantContextMonth[];
  diagnostics: { month: string; category: string; type: string; summary: string }[];
  forecast: {
    method: string;
    forecastMonth: string;
    predictedNet: number;
    confidenceLow: number;
    confidenceHigh: number;
    cashRunwayMonths: number | null;
  } | null;
  recommendations: { action: string; priority: string }[];
}

/**
 * Build the governed-aggregate bundle the assistant is allowed to reason over.
 * Reads only derived/rollup tables — no raw Transaction rows leave the server.
 */
export async function assembleAssistantContext(userId: string): Promise<AssistantContext> {
  // Pull every governed tier in parallel. Each read lazily recomputes if empty,
  // so a brand-new user still gets a (possibly empty) coherent bundle.
  const [summary, diagnostics, forecast, recommendations] = await Promise.all([
    getDescriptiveSummary(userId, MONTHS_WINDOW),
    getDiagnosticInsights(userId, MAX_DIAGNOSTICS),
    getLatestForecastSnapshot(userId),
    getRecommendations(userId, "PENDING"),
  ]);

  const months: AssistantContextMonth[] = summary.months.map((m) => ({
    month: m.month,
    totalIncome: round(m.totalIncome),
    totalExpense: round(m.totalExpense),
    net: round(m.net),
    topCategories: m.byCategory
      .slice(0, TOP_CATEGORIES)
      .map((c) => ({
        category: c.category,
        totalExpense: round(c.totalExpense),
        txCount: c.txCount,
      })),
  }));

  return {
    currency: "THB",
    generatedAt: new Date().toISOString(),
    months,
    diagnostics: diagnostics.slice(0, MAX_DIAGNOSTICS).map((d) => ({
      month: d.month,
      category: d.category,
      type: d.insightType,
      summary: d.summary,
    })),
    forecast: forecast
      ? {
          method: forecast.method,
          forecastMonth: forecast.forecastMonth,
          predictedNet: round(forecast.predictedNet),
          confidenceLow: round(forecast.confidenceLow),
          confidenceHigh: round(forecast.confidenceHigh),
          cashRunwayMonths:
            forecast.cashRunwayMonths != null
              ? Math.round(forecast.cashRunwayMonths * 10) / 10
              : null,
        }
      : null,
    recommendations: recommendations
      .slice(0, MAX_RECOMMENDATIONS)
      .map((r) => ({ action: r.action, priority: r.priority })),
  };
}
