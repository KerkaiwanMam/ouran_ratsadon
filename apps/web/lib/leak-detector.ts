// Business Layer leak detection — all 4 rules.
// Spec: docs/analyzer-spec.md → "Leak detection rules (Business Layer)"
//
// Phase 0 shipped Outlier only.
// Phase 1 adds Monthly Spike, Duplicate Payment, and Recurring Cost Creep.

import type { LeakFlag, Severity } from "@prisma/client";

export interface RawTx {
  date: Date;
  description: string;
  amount: number;
  transactionType: "INCOME" | "EXPENSE";
}

// leakFlag/leakSeverity are persisted into enum columns on Transaction —
// values MUST be members of Prisma's LeakFlag/Severity enums or the insert
// throws at runtime. Duplicate-payment and changed-amount-reimport both map
// to DUPLICATE; leakReason carries the distinction for the UI.
export interface LeakResult {
  leakFlag: LeakFlag;
  leakSeverity: Severity | null;
  leakReason: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Bigram-based similarity (0-1). Works for Thai because it's character-level. */
function stringSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const an = norm(a);
  const bn = norm(b);
  if (an === bn) return 1;
  if (an.length < 2 || bn.length < 2) return an === bn ? 1 : 0;

  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s[i] + s[i + 1]);
    return set;
  };
  const sa = bigrams(an);
  const sb = bigrams(bn);
  let intersection = 0;
  for (const b of sa) if (sb.has(b)) intersection++;
  return (2 * intersection) / (sa.size + sb.size);
}

// ─── Rule 1 — Monthly Spike ───────────────────────────────────────────────────
// Category total >30% above trailing 3-month average → flag "ค่าใช้จ่ายพุ่งสูง"
// Requires knowing each transaction's category — caller must pass categorize fn.

function detectMonthlySpike(
  transactions: RawTx[],
  categorize: (desc: string) => string
): Map<number, LeakResult> {
  const flags = new Map<number, LeakResult>();

  // Build monthly category totals
  const monthCatTotal: Record<string, number> = {};
  transactions.forEach((tx) => {
    if (tx.transactionType !== "EXPENSE") return;
    const key = `${monthKey(tx.date)}::${categorize(tx.description)}`;
    monthCatTotal[key] = (monthCatTotal[key] ?? 0) + Math.abs(tx.amount);
  });

  // For each expense, check if its month/category total exceeds trailing 3-mo avg by >30%
  transactions.forEach((tx, i) => {
    if (tx.transactionType !== "EXPENSE") return;
    const cat = categorize(tx.description);
    const thisMonth = monthKey(tx.date);
    const thisTotal = monthCatTotal[`${thisMonth}::${cat}`] ?? 0;

    // Trailing months (1, 2, 3 months before)
    const trailing: number[] = [];
    for (let offset = 1; offset <= 3; offset++) {
      const d = new Date(tx.date);
      d.setMonth(d.getMonth() - offset);
      const total = monthCatTotal[`${monthKey(d)}::${cat}`];
      if (total !== undefined) trailing.push(total);
    }
    if (trailing.length === 0) return; // not enough history
    const avg = trailing.reduce((a, b) => a + b, 0) / trailing.length;
    if (avg === 0) return;
    const spike = (thisTotal - avg) / avg;
    if (spike > 0.3) {
      flags.set(i, {
        leakFlag: "SPIKE",
        leakSeverity: spike > 0.6 ? "CRITICAL" : "WARNING",
        leakReason: `ค่าใช้จ่ายหมวด${cat} เดือนนี้สูงกว่าค่าเฉลี่ย 3 เดือนที่ผ่านมา ${(spike * 100).toFixed(0)}%`,
      });
    }
  });

  return flags;
}

// ─── Rule 2 — Duplicate Payment ───────────────────────────────────────────────
// Same amount + date diff <7 days + description similarity >85% → flag "อาจชำระซ้ำ"

function detectDuplicatePayment(transactions: RawTx[]): Map<number, LeakResult> {
  const flags = new Map<number, LeakResult>();
  const expenses = transactions
    .map((tx, i) => ({ tx, i }))
    .filter(({ tx }) => tx.transactionType === "EXPENSE");

  for (let a = 0; a < expenses.length; a++) {
    for (let b = a + 1; b < expenses.length; b++) {
      const ta = expenses[a].tx;
      const tb = expenses[b].tx;
      const ia = expenses[a].i;
      const ib = expenses[b].i;

      if (flags.has(ia) && flags.has(ib)) continue;

      const amountMatch = Math.abs(Math.abs(ta.amount) - Math.abs(tb.amount)) < 1;
      if (!amountMatch) continue;

      const diffDays =
        Math.abs(ta.date.getTime() - tb.date.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 7) continue;

      const sim = stringSimilarity(ta.description, tb.description);
      if (sim < 0.85) continue;

      const reason = `อาจชำระซ้ำ: รายการ "${tb.description}" ฿${Math.abs(tb.amount).toLocaleString()} ห่างกัน ${diffDays.toFixed(0)} วัน (ความคล้ายกัน ${(sim * 100).toFixed(0)}%)`;
      const result: LeakResult = {
        leakFlag: "DUPLICATE",
        leakSeverity: "WARNING",
        leakReason: reason,
      };
      if (!flags.has(ia)) flags.set(ia, result);
      if (!flags.has(ib)) flags.set(ib, result);
    }
  }

  return flags;
}

// ─── Rule 3 — Outlier ─────────────────────────────────────────────────────────
// Amount >2.5 SD from same-category items → flag "ค่าใช้จ่ายผิดปกติ"

function detectOutlier(
  transactions: RawTx[],
  categorize: (desc: string) => string
): Map<number, LeakResult> {
  const flags = new Map<number, LeakResult>();
  const categoryAmounts: Record<string, number[]> = {};

  transactions.forEach((tx) => {
    if (tx.transactionType !== "EXPENSE") return;
    const cat = categorize(tx.description);
    if (!categoryAmounts[cat]) categoryAmounts[cat] = [];
    categoryAmounts[cat].push(Math.abs(tx.amount));
  });

  transactions.forEach((tx, i) => {
    if (tx.transactionType !== "EXPENSE") return;
    const cat = categorize(tx.description);
    const amounts = categoryAmounts[cat] ?? [];
    if (amounts.length < 3) return;
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length;
    const sd = Math.sqrt(variance);
    const z = (Math.abs(tx.amount) - mean) / (sd || 1);
    if (z > 2.5) {
      flags.set(i, {
        leakFlag: "OUTLIER",
        leakSeverity: z > 3.5 ? "CRITICAL" : "WARNING",
        leakReason: `จำนวนเงินสูงกว่าค่าเฉลี่ยหมวด${cat} ${z.toFixed(1)} SD`,
      });
    }
  });

  return flags;
}

// ─── Rule 4 — Recurring Cost Creep ───────────────────────────────────────────
// Same description recurring >5% monthly growth for 3+ consecutive months → flag "ค่าใช้จ่ายประจำเพิ่มขึ้น"

function detectRecurringCostCreep(transactions: RawTx[]): Map<number, LeakResult> {
  const flags = new Map<number, LeakResult>();

  // Group expense amounts by (normalized description, month)
  const descMonthAmount: Record<string, Record<string, number>> = {};
  transactions.forEach((tx) => {
    if (tx.transactionType !== "EXPENSE") return;
    const key = tx.description.trim().toLowerCase();
    const mo = monthKey(tx.date);
    if (!descMonthAmount[key]) descMonthAmount[key] = {};
    descMonthAmount[key][mo] = (descMonthAmount[key][mo] ?? 0) + Math.abs(tx.amount);
  });

  // For each description with ≥4 months of data, check for 3+ consecutive months of >5% growth
  const creepDescriptions = new Set<string>();
  for (const [desc, byMonth] of Object.entries(descMonthAmount)) {
    const months = Object.keys(byMonth).sort();
    if (months.length < 4) continue;

    let streak = 0;
    for (let i = 1; i < months.length; i++) {
      const prev = byMonth[months[i - 1]];
      const curr = byMonth[months[i]];
      if (prev > 0 && (curr - prev) / prev > 0.05) {
        streak++;
        if (streak >= 3) {
          creepDescriptions.add(desc);
          break;
        }
      } else {
        streak = 0;
      }
    }
  }

  // Flag all transactions whose description is in the creep set
  transactions.forEach((tx, i) => {
    if (tx.transactionType !== "EXPENSE") return;
    const key = tx.description.trim().toLowerCase();
    if (creepDescriptions.has(key)) {
      flags.set(i, {
        leakFlag: "CREEP",
        leakSeverity: "WARNING",
        leakReason: `รายการ "${tx.description}" มีค่าใช้จ่ายเพิ่มขึ้น >5% ต่อเดือนติดต่อกัน 3 เดือนขึ้นไป`,
      });
    }
  });

  return flags;
}

// ─── Combined detector ────────────────────────────────────────────────────────

export function detectLeaks(
  transactions: RawTx[],
  categorize: (desc: string) => string
): LeakResult[] {
  const spikes = detectMonthlySpike(transactions, categorize);
  const duplicates = detectDuplicatePayment(transactions);
  const outliers = detectOutlier(transactions, categorize);
  const creep = detectRecurringCostCreep(transactions);

  return transactions.map((_, i) => {
    // Priority: DUPLICATE > SPIKE > OUTLIER > CREEP
    return (
      duplicates.get(i) ??
      spikes.get(i) ??
      outliers.get(i) ??
      creep.get(i) ?? {
        leakFlag: "NONE",
        leakSeverity: null,
        leakReason: null,
      }
    );
  });
}
