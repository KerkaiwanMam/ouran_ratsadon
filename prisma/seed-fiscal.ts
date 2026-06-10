/**
 * Seed script — FiscalYearSummary
 *
 * Usage:
 *   cd apps/web
 *   npx prisma db push          # push schema first (only needed once)
 *   npx ts-node ../../prisma/seed-fiscal.ts
 *
 * Or from repo root:
 *   DATABASE_URL=... npx ts-node --project apps/web/tsconfig.json prisma/seed-fiscal.ts
 */

import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface FiscalYearRaw {
  fiscal_year: string;
  total_revenue: number;
  total_expenditure: number;
  balance: number;
  public_debt: number;
  gdp_estimate?: number;
  debt_to_gdp_pct?: number;
  source_notes?: string;
}

interface FiscalSummaryFile {
  metadata: { sources: string[] };
  fiscal_years: FiscalYearRaw[];
}

async function main() {
  const filePath = path.resolve(__dirname, "../data/fiscal-summary.json");
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as FiscalSummaryFile;

  console.log(`Seeding ${raw.fiscal_years.length} fiscal year records…`);

  for (const row of raw.fiscal_years) {
    await prisma.fiscalYearSummary.upsert({
      where: { fiscalYear: row.fiscal_year },
      update: {
        totalRevenue:     row.total_revenue,
        totalExpenditure: row.total_expenditure,
        balance:          row.balance,
        publicDebt:       row.public_debt,
        gdpEstimate:      row.gdp_estimate ?? null,
        debtToGdpPct:     row.debt_to_gdp_pct ?? null,
        source:           raw.metadata.sources[0],
        sourceNotes:      row.source_notes ?? null,
      },
      create: {
        fiscalYear:       row.fiscal_year,
        totalRevenue:     row.total_revenue,
        totalExpenditure: row.total_expenditure,
        balance:          row.balance,
        publicDebt:       row.public_debt,
        gdpEstimate:      row.gdp_estimate ?? null,
        debtToGdpPct:     row.debt_to_gdp_pct ?? null,
        source:           raw.metadata.sources[0],
        sourceNotes:      row.source_notes ?? null,
      },
    });
    console.log(`  ✓ ปีงบประมาณ ${row.fiscal_year}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
