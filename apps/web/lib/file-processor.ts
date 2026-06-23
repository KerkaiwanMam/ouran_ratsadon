/**
 * Shared transaction-processing pipeline for uploaded Business Layer files.
 *
 * Extracted from app/api/files/upload/route.ts so both the legacy direct-upload
 * route and the new presign → R2 → confirm route (Phase 3A) share one
 * implementation of dedup/categorize/leak-detect/insert.
 */
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { detectLeaks } from "@/lib/leak-detector";
import { recomputeMonthlySummary } from "@/lib/analytics/summary";
import { recomputeDiagnosticInsights } from "@/lib/analytics/diagnose";
import { recomputeRecommendations } from "@/lib/analytics/recommend";
import { sanitizeStringField } from "@/lib/file-sanitizer";
import { triggerLeakAlerts, checkOverBudgetAlerts } from "@/lib/alert-triggers";

export function hashFileBytes(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * rowHash = identical-row fingerprint (date + description + amount + type +
 * occurrence index). occurrence index disambiguates legitimate repeats within
 * one file/day (e.g. two ฿120 coffees on the same date) — without it they'd
 * collapse into a single hash and the second one would be wrongly skipped as
 * a duplicate.
 *
 * softKey = same fingerprint MINUS amount/category — used to recognize "this
 * is the same underlying transaction, but the figure changed" so we can flag
 * it for review rather than silently double-count or silently overwrite.
 */
function fingerprintRow(
  userId: string,
  tx: { date: Date; description: string; amount: number; transactionType: string },
  occurrence: number
): { rowHash: string; softKey: string } {
  const day = tx.date.toISOString().slice(0, 10);
  const normalizedDesc = tx.description.trim().toLowerCase();
  const rowHash = createHash("sha256")
    .update(`${userId}|${day}|${normalizedDesc}|${tx.amount}|${tx.transactionType}|${occurrence}`)
    .digest("hex");
  const softKey = createHash("sha256")
    .update(`${userId}|${day}|${normalizedDesc}|${tx.transactionType}|${occurrence}`)
    .digest("hex");
  return { rowHash, softKey };
}

// ─── Keyword categorizer ─────────────────────────────────────────────────────

const CATEGORIES: { pattern: RegExp; category: string }[] = [
  { pattern: /เงินเดือน|ค่าจ้าง|salary|wage|สวัสดิการ|บุคลากร/i, category: "บุคลากร" },
  { pattern: /ค่าเช่า|rent|office|สำนักงาน/i, category: "สถานที่" },
  { pattern: /วัตถุดิบ|สินค้า|material|inventory|stock/i, category: "ต้นทุนสินค้า" },
  { pattern: /ไฟฟ้า|น้ำประปา|โทรศัพท์|internet|utility|สาธารณูปโภค/i, category: "สาธารณูปโภค" },
  { pattern: /โฆษณา|marketing|ads|ประชาสัมพันธ์/i, category: "การตลาด" },
  { pattern: /เดินทาง|travel|transport|ขนส่ง|เชื้อเพลิง|น้ำมัน/i, category: "ค่าเดินทาง" },
  { pattern: /ซ่อม|บำรุง|repair|maintenance/i, category: "ซ่อมบำรุง" },
  { pattern: /ประกัน|insurance/i, category: "ประกัน" },
  { pattern: /ดอกเบี้ย|กู้|loan|interest/i, category: "การเงิน" },
  { pattern: /อุปกรณ์|เครื่องมือ|equipment|tool/i, category: "อุปกรณ์" },
];

export interface UserCategoryRule {
  keyword: string;
  category: string;
}

/**
 * Categorize a transaction description. User-defined CategoryRule rows
 * (learned from past category overrides) take priority over the built-in
 * keyword patterns — `rules` should be pre-sorted by priority/usageCount
 * (most-trusted first) by the caller.
 */
export function categorize(
  description: string,
  rules: UserCategoryRule[] = []
): { category: string; autoCategorized: boolean } {
  const lowerDesc = description.toLowerCase();
  for (const rule of rules) {
    if (rule.keyword && lowerDesc.includes(rule.keyword.toLowerCase())) {
      return { category: rule.category, autoCategorized: true };
    }
  }
  for (const { pattern, category } of CATEGORIES) {
    if (pattern.test(description)) {
      return { category, autoCategorized: true };
    }
  }
  return { category: "ยังไม่จัดหมวดหมู่", autoCategorized: false };
}

export interface RawTx {
  date: Date;
  description: string;
  amount: number;
  transactionType: "INCOME" | "EXPENSE";
}

export interface FinalizeResult {
  file: {
    id: string;
    filename: string;
    status: "DONE";
    transactionCount: number;
    uploadedAt: Date;
  };
  dedup: {
    imported: number;
    skippedExactDuplicates: number;
    flaggedChanged: number;
  };
}

/**
 * Run dedup/categorize/leak-detect, insert transactions, mark the file DONE,
 * and refresh analytics. Throws on failure — caller is responsible for
 * marking the file ERROR.
 */
export async function finalizeFileUpload(
  fileRecord: { id: string; filename: string; uploadedAt: Date },
  transactions: RawTx[],
  userId: string
): Promise<FinalizeResult> {
  // User-taught rules (from past category overrides) win over the built-in
  // keyword patterns — most-trusted (highest priority/usage) first.
  const userRules = await prisma.categoryRule.findMany({
    where: { userId },
    orderBy: [{ priority: "desc" }, { usageCount: "desc" }],
    select: { keyword: true, category: true },
  });

  const leakResults = detectLeaks(transactions, (desc) => categorize(desc, userRules).category);

  // ── Row-level dedup: fingerprint each row, then compare against what this
  // user has already imported (across ALL their files, not just this one —
  // catches "re-uploaded a wider export that overlaps an old one").
  const occurrenceCount: Record<string, number> = {};
  // Attach each row's leak result HERE, while indices still line up with the
  // original transactions array — after the duplicate filter below, positional
  // indices no longer match leakResults and flags would land on wrong rows.
  const fingerprinted = transactions.map((tx, originalIndex) => {
    const day = tx.date.toISOString().slice(0, 10);
    const dedupKey = `${day}|${tx.description.trim().toLowerCase()}|${tx.transactionType}`;
    const occurrence = occurrenceCount[dedupKey] ?? 0;
    occurrenceCount[dedupKey] = occurrence + 1;
    const { rowHash, softKey } = fingerprintRow(userId, tx, occurrence);
    return { tx, rowHash, softKey, leak: leakResults[originalIndex] };
  });

  const allHashes = fingerprinted.map((f) => f.rowHash);
  const allSoftKeys = fingerprinted.map((f) => f.softKey);

  const [exactMatches, softMatches] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, rowHash: { in: allHashes } },
      select: { rowHash: true },
    }),
    prisma.transaction.findMany({
      where: { userId, softKey: { in: allSoftKeys } },
      select: { softKey: true, amount: true, category: true },
    }),
  ]);
  const exactHashSet = new Set(exactMatches.map((m) => m.rowHash));
  const softKeyMap = new Map(softMatches.map((m) => [m.softKey, m]));

  let skippedExactDuplicates = 0;
  let flaggedChanged = 0;

  const txData = fingerprinted
    // Exact duplicate of a row already stored for this user → skip entirely,
    // don't insert and don't double-count totals/leak stats.
    .filter(({ rowHash }) => {
      if (exactHashSet.has(rowHash)) {
        skippedExactDuplicates++;
        return false;
      }
      return true;
    })
    .map(({ tx, rowHash, softKey, leak }) => {
      const { category, autoCategorized } = categorize(tx.description, userRules);

      // Same date+description+type as something we already have, but the
      // amount/category differs → likely a corrected re-export. Insert it
      // (the user's newest data should win on the dashboard) but flag it as
      // DUPLICATE so leak detection surfaces it for the user to review,
      // instead of silently overwriting or silently double-counting.
      const prior = softKeyMap.get(softKey);
      // prior.amount is Prisma.Decimal — coerce to number for comparison and display.
      const priorAmt = prior ? Number(prior.amount) : null;
      // CSV injection guard before DB insert
      const safeDescription = sanitizeStringField(tx.description);

      if (prior && priorAmt !== tx.amount) {
        flaggedChanged++;
        return {
          ...tx,
          description: safeDescription,
          userId,
          fileId: fileRecord.id,
          category,
          autoCategorized,
          rowHash,
          softKey,
          leakFlag: "DUPLICATE" as const,
          leakSeverity: "WARNING" as const,
          leakReason: `รายการนี้คล้ายกับรายการที่เคยนำเข้าไว้แล้ว (฿${priorAmt?.toLocaleString()}) แต่จำนวนเงินครั้งนี้คือ ฿${tx.amount.toLocaleString()} — โปรดตรวจสอบว่าเป็นการแก้ไขข้อมูลเดิมหรือรายการใหม่`,
        };
      }

      return {
        ...tx,
        description: safeDescription,
        userId,
        fileId: fileRecord.id,
        category,
        autoCategorized,
        rowHash,
        softKey,
        ...leak,
      };
    });

  if (txData.length > 0) {
    await prisma.transaction.createMany({ data: txData });
  }

  const incomes = txData.filter((t) => t.transactionType === "INCOME");
  const expenses = txData.filter((t) => t.transactionType === "EXPENSE");
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
  // Explicit comparator — default sort stringifies Dates ("Fri…" < "Mon…"),
  // which is alphabetical by weekday name, not chronological.
  const dates = txData.map((t) => t.date).sort((a, b) => a.getTime() - b.getTime());

  await prisma.file.update({
    where: { id: fileRecord.id },
    data: {
      status: "DONE",
      processedAt: new Date(),
      transactionCount: txData.length,
      totalIncome,
      totalExpense,
      periodStart: dates[0],
      periodEnd: dates[dates.length - 1],
    },
  });

  // Tier 1 — Descriptive Analytics: refresh the user's pre-aggregated
  // month × category rollups now that new transactions exist. Non-fatal:
  // the dashboard lazily recomputes on read if this fails, so we don't want
  // an analytics hiccup to break the upload response.
  try {
    await recomputeMonthlySummary(userId);
    await recomputeDiagnosticInsights(userId);
    await recomputeRecommendations(userId);
  } catch (err) {
    console.error("analytics recompute failed after upload:", err);
  }

  // In-app (+ email/LINE) alerts for what this upload surfaced — non-fatal,
  // a failed notification shouldn't fail the upload response.
  try {
    const criticalCount = txData.filter((t) => t.leakSeverity === "CRITICAL").length;
    const warningCount = txData.filter((t) => t.leakSeverity === "WARNING").length;
    await triggerLeakAlerts(userId, fileRecord.id, criticalCount, warningCount);
    await checkOverBudgetAlerts(userId);
  } catch (err) {
    console.error("alert triggers failed after upload:", err);
  }

  return {
    file: {
      id: fileRecord.id,
      filename: fileRecord.filename,
      status: "DONE",
      transactionCount: txData.length,
      uploadedAt: fileRecord.uploadedAt,
    },
    // Surfaces what the dedup pass did so the UI can show something like
    // "นำเข้า 240 รายการใหม่ • ข้าม 12 รายการซ้ำ • พบ 3 รายการที่ตัวเลขเปลี่ยนไป (ตรวจสอบในหน้ารายการ)"
    dedup: {
      imported: txData.length,
      skippedExactDuplicates,
      flaggedChanged,
    },
  };
}
