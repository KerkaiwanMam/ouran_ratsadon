// Cash flow forecaster — Weighted Moving Average + Seasonal Index.
// Spec: docs/analyzer-spec.md → "Forecast logic (NOT ML)"
//
// Always disclose: "การพยากรณ์ใช้ค่าเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ AI"

export interface MonthlyPoint {
  month: string; // "YYYY-MM"
  income: number;
  expense: number;
  net: number;
}

export interface ForecastPoint {
  month: string;
  forecastIncome: number;
  forecastExpense: number;
  forecastNet: number;
  upperIncome: number;
  lowerIncome: number;
  upperExpense: number;
  lowerExpense: number;
}

export type DataSufficiency = "insufficient" | "wma_only" | "full";

export interface ForecastResult {
  sufficiency: DataSufficiency;
  monthsOfData: number;
  historical: MonthlyPoint[];
  forecast: ForecastPoint[];
  runway: number | null; // months until cash hits zero at current burn
  disclaimer: string;
}

// ─── Core WMA ────────────────────────────────────────────────────────────────

/** Weighted Moving Average: weight most recent 3 months [3, 2, 1] / 6. */
function wma(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  if (values.length === 2) return (values[1] * 3 + values[0] * 1) / 4;
  const last3 = values.slice(-3);
  return (last3[2] * 3 + last3[1] * 2 + last3[0] * 1) / 6;
}

/** Simple stddev for confidence band (±1 SD). */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Seasonal index: avg for month i divided by overall average. */
function seasonalIndex(values: number[], months: string[]): number[] {
  const overallAvg = values.reduce((a, b) => a + b, 0) / values.length;
  if (overallAvg === 0) return new Array(12).fill(1);
  const monthSums: number[] = new Array(12).fill(0);
  const monthCounts: number[] = new Array(12).fill(0);
  values.forEach((v, i) => {
    const mo = parseInt(months[i].split("-")[1], 10) - 1;
    monthSums[mo] += v;
    monthCounts[mo]++;
  });
  return monthSums.map((sum, i) =>
    monthCounts[i] > 0 ? sum / monthCounts[i] / overallAvg : 1
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function forecast(
  historical: MonthlyPoint[],
  horizonMonths = 6,
  currentCash = 0
): ForecastResult {
  const n = historical.length;

  if (n < 3) {
    return {
      sufficiency: "insufficient",
      monthsOfData: n,
      historical,
      forecast: [],
      runway: null,
      disclaimer: "ต้องมีข้อมูลอย่างน้อย 3 เดือนจึงจะพยากรณ์ได้",
    };
  }

  const useSeasonality = n >= 12;
  const incomes = historical.map((p) => p.income);
  const expenses = historical.map((p) => p.expense);
  const months = historical.map((p) => p.month);

  const incomeSI = useSeasonality ? seasonalIndex(incomes, months) : null;
  const expenseSI = useSeasonality ? seasonalIndex(expenses, months) : null;

  const incomeSD = stdDev(incomes);
  const expenseSD = stdDev(expenses);

  // Forecast next N months
  const forecastPoints: ForecastPoint[] = [];
  const lastMonth = historical[n - 1].month;
  const [lastYear, lastMo] = lastMonth.split("-").map(Number);

  const projectedIncomes = [...incomes];
  const projectedExpenses = [...expenses];

  for (let i = 1; i <= horizonMonths; i++) {
    const totalMo = lastMo - 1 + i;
    const forecastYear = lastYear + Math.floor(totalMo / 12);
    const forecastMo = (totalMo % 12) + 1;
    const forecastMonth = `${forecastYear}-${String(forecastMo).padStart(2, "0")}`;
    const moIndex = forecastMo - 1;

    const baseIncome = wma(projectedIncomes);
    const baseExpense = wma(projectedExpenses);

    const forecastIncome = incomeSI ? baseIncome * (incomeSI[moIndex] ?? 1) : baseIncome;
    const forecastExpense = incomeSI ? baseExpense * (expenseSI![moIndex] ?? 1) : baseExpense;

    forecastPoints.push({
      month: forecastMonth,
      forecastIncome: Math.max(0, forecastIncome),
      forecastExpense: Math.max(0, forecastExpense),
      forecastNet: forecastIncome - forecastExpense,
      upperIncome: forecastIncome + incomeSD,
      lowerIncome: Math.max(0, forecastIncome - incomeSD),
      upperExpense: forecastExpense + expenseSD,
      lowerExpense: Math.max(0, forecastExpense - expenseSD),
    });

    projectedIncomes.push(forecastIncome);
    projectedExpenses.push(forecastExpense);
  }

  // Cash runway: months until cash hits zero at avg net burn
  const avgNetBurn = expenses.reduce((a, b) => a + b, 0) / n
    - incomes.reduce((a, b) => a + b, 0) / n;
  const runway = avgNetBurn > 0 && currentCash > 0
    ? Math.round(currentCash / avgNetBurn)
    : null;

  return {
    sufficiency: useSeasonality ? "full" : "wma_only",
    monthsOfData: n,
    historical,
    forecast: forecastPoints,
    runway,
    disclaimer: useSeasonality
      ? "การพยากรณ์ใช้ค่าเฉลี่ยถ่วงน้ำหนัก + ดัชนีฤดูกาล ไม่ใช่ AI — ประกอบการตัดสินใจเท่านั้น"
      : "การพยากรณ์ใช้ค่าเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ AI — ยังไม่พอสำหรับการปรับตามฤดูกาล (ต้องการ 12 เดือนขึ้นไป)",
  };
}

/** What-if: adjust income by a percentage and recompute runway. */
export function whatIf(
  base: ForecastResult,
  revenueChangePct: number,
  currentCash = 0
): { adjustedForecast: ForecastPoint[]; newRunway: number | null } {
  const factor = 1 + revenueChangePct / 100;
  const adjusted = base.forecast.map((p) => ({
    ...p,
    forecastIncome: p.forecastIncome * factor,
    forecastNet: p.forecastIncome * factor - p.forecastExpense,
    upperIncome: p.upperIncome * factor,
    lowerIncome: p.lowerIncome * factor,
  }));

  const avgExpense =
    base.historical.reduce((a, b) => a + b.expense, 0) / base.historical.length;
  const avgIncome =
    (base.historical.reduce((a, b) => a + b.income, 0) / base.historical.length) * factor;
  const netBurn = avgExpense - avgIncome;
  const newRunway = netBurn > 0 && currentCash > 0 ? Math.round(currentCash / netBurn) : null;

  return { adjustedForecast: adjusted, newRunway };
}
