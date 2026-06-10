import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/civic/fiscal
 *
 * Returns all FiscalYearSummary rows sorted by fiscalYear ascending.
 * Falls back to data/fiscal-summary.json if the DB table is empty (e.g. seed
 * not run yet) so the page always has data to render.
 */
export async function GET() {
  try {
    const rows = await prisma.fiscalYearSummary.findMany({
      orderBy: { fiscalYear: "asc" },
      select: {
        fiscalYear:       true,
        totalRevenue:     true,
        totalExpenditure: true,
        balance:          true,
        publicDebt:       true,
        gdpEstimate:      true,
        debtToGdpPct:     true,
        source:           true,
        sourceNotes:      true,
      },
    });

    // If DB is seeded, return directly
    if (rows.length > 0) {
      return NextResponse.json({
        source: "db",
        data: rows.map(toResponse),
      });
    }

    // Fallback: read from JSON file (useful in dev before seed is run)
    const fallback = await loadJsonFallback();
    return NextResponse.json({ source: "json", data: fallback });
  } catch (err) {
    console.error("[/api/civic/fiscal]", err);
    // Even if DB is unreachable, try to serve the JSON
    try {
      const fallback = await loadJsonFallback();
      return NextResponse.json({ source: "json", data: fallback });
    } catch {
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "ไม่สามารถโหลดข้อมูลการคลังได้" },
        { status: 500 }
      );
    }
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function toResponse(row: {
  fiscalYear: string;
  totalRevenue: unknown;
  totalExpenditure: unknown;
  balance: unknown;
  publicDebt: unknown;
  gdpEstimate: unknown;
  debtToGdpPct: unknown;
  source: string;
  sourceNotes: string | null;
}) {
  return {
    fiscalYear:       row.fiscalYear,
    totalRevenue:     Number(row.totalRevenue),
    totalExpenditure: Number(row.totalExpenditure),
    balance:          Number(row.balance),
    publicDebt:       Number(row.publicDebt),
    gdpEstimate:      row.gdpEstimate ? Number(row.gdpEstimate) : null,
    debtToGdpPct:     row.debtToGdpPct ? Number(row.debtToGdpPct) : null,
    source:           row.source,
    sourceNotes:      row.sourceNotes,
  };
}

async function loadJsonFallback() {
  const fs = (await import("fs")).default;
  const path = (await import("path")).default;
  const filePath = path.resolve(process.cwd(), "../../data/fiscal-summary.json");
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    fiscal_years: {
      fiscal_year: string;
      total_revenue: number;
      total_expenditure: number;
      balance: number;
      public_debt: number;
      gdp_estimate?: number;
      debt_to_gdp_pct?: number;
      source_notes?: string;
    }[];
  };
  return raw.fiscal_years.map((r) => ({
    fiscalYear:       r.fiscal_year,
    totalRevenue:     r.total_revenue,
    totalExpenditure: r.total_expenditure,
    balance:          r.balance,
    publicDebt:       r.public_debt,
    gdpEstimate:      r.gdp_estimate ?? null,
    debtToGdpPct:     r.debt_to_gdp_pct ?? null,
    source:           "สำนักงานเศรษฐกิจการคลัง (สศค.)",
    sourceNotes:      r.source_notes ?? null,
  }));
}
