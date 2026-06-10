import { NextRequest, NextResponse } from "next/server";
import type { CivicSourceFormat } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildAndPersistCivicYear, countRedFlags, type EtlRow } from "@/lib/civic-etl";
import { invalidateYear } from "@/lib/civic-cache";
import { writeAdminLog, checkUploadRateLimit, validateFileMagicBytes } from "@/lib/admin-audit";

const ALLOWED_EXTS = new Set(["xlsx", "xls", "csv", "html", "htm"]);
const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150 MB — must match apps/parser/main.py MAX_SIZE
const PARSER_URL = process.env.PARSER_URL ?? "http://localhost:8000";

/**
 * Fix #5: Calculate the next version number INSIDE a serializable transaction
 * so two concurrent uploads for the same fiscal year cannot both read "latest=1"
 * and both try to insert version 2. The @@unique([fiscalYear, version]) constraint
 * in schema.prisma is the hard backstop — this function eliminates the race so
 * callers get a clean increment instead of a unique-constraint error.
 */
async function getNextVersionInTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  fiscalYear: string
): Promise<number> {
  const last = await tx.civicDataVersion.findFirst({
    where: { fiscalYear },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return (last?.version ?? 0) + 1;
}

export async function POST(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN", message: "เฉพาะผู้ดูแลระบบเท่านั้น" }, { status: 403 });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_INPUT", message: "ไม่สามารถอ่านข้อมูลฟอร์มได้" }, { status: 400 });
  }

  const fiscalYearStr = String(formData.get("fiscalYear") ?? "");
  const mode = String(formData.get("mode") ?? "") as "add" | "replace" | "delete";
  const notes = (formData.get("notes") as string | null) ?? undefined;

  const fiscalYear = parseInt(fiscalYearStr, 10);
  if (!fiscalYear || fiscalYear < 2500 || fiscalYear > 2700) {
    return NextResponse.json(
      { error: "INVALID_FISCAL_YEAR", message: "ปีงบประมาณไม่ถูกต้อง (ต้องเป็น พ.ศ. เช่น 2568)" },
      { status: 400 }
    );
  }

  if (!["add", "replace", "delete"].includes(mode)) {
    return NextResponse.json({ error: "INVALID_MODE", message: "mode ต้องเป็น add | replace | delete" }, { status: 400 });
  }

  // ── Rate limiting (add/replace only — deletes are not rate-limited) ─────────
  if (mode !== "delete") {
    const rl = checkUploadRateLimit(payload.sub);
    if (!rl.allowed) {
      const retryMins = Math.ceil((rl.retryAfterMs ?? 3600000) / 60000);
      return NextResponse.json(
        { error: "RATE_LIMITED", message: `อัปโหลดได้สูงสุด 5 ครั้ง/ชั่วโมง กรุณารอ ${retryMins} นาที` },
        { status: 429 }
      );
    }
  }

  // ── DELETE mode: no file needed ─────────────────────────────────────────────
  if (mode === "delete") {
    await prisma.civicDataVersion.updateMany({
      where: { fiscalYear: fiscalYearStr, status: "ACTIVE" },
      data: { status: "DELETED", isActive: false },
    });
    await prisma.budgetLineItem.deleteMany({ where: { fiscalYear } });

    const dataFile = path.join(process.cwd(), "data", `budget-${fiscalYearStr}.json`);
    try { await fs.unlink(dataFile); } catch { /* file may not exist */ }
    invalidateYear(fiscalYearStr);

    void writeAdminLog({
      adminId: payload.sub,
      action: "CIVIC_DELETE",
      detail: { fiscalYear: fiscalYearStr, mode: "delete_year" },
      ip: clientIp,
    });

    return NextResponse.json({ ok: true, message: `ลบข้อมูลปีงบประมาณ ${fiscalYearStr} เรียบร้อยแล้ว` });
  }

  // ── ADD / REPLACE: file required ────────────────────────────────────────────
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "FILE_REQUIRED", message: "กรุณาแนบไฟล์ (.xlsx / .csv / .html)" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "FILE_TOO_LARGE", message: "ไฟล์มีขนาดเกิน 150 MB กรุณาแบ่งไฟล์ก่อนอัปโหลด" },
      { status: 413 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json(
      { error: "INVALID_FORMAT", message: "รองรับเฉพาะ .xlsx, .xls, .csv, .html เท่านั้น" },
      { status: 400 }
    );
  }

  // ── Magic-bytes content validation ─────────────────────────────────────────
  // Read just the first 512 bytes — avoids buffering the entire file for the check.
  const headerBytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const magicError = validateFileMagicBytes(headerBytes, ext);
  if (magicError) {
    return NextResponse.json({ error: "INVALID_CONTENT", message: magicError }, { status: 400 });
  }

  // ext is already validated against ALLOWED_EXTS; normalize the two aliases
  // (xls→xlsx, htm→html) onto Prisma's CivicSourceFormat enum (xlsx|csv|html).
  const sourceFormat: CivicSourceFormat =
    ext === "xls" ? "xlsx" : ext === "htm" ? "html" : (ext as CivicSourceFormat);

  // ── Create CivicDataVersion (PROCESSING) — Fix #5: atomic version numbering ─
  // Read max(version) and insert the new row inside a single serializable
  // transaction so concurrent uploads for the same year never collide.
  // The @@unique([fiscalYear, version]) constraint in schema.prisma is the
  // hard backstop; this makes the happy-path collision-free.
  const versionRecord = await prisma.$transaction(async (tx) => {
    const nextVersion = await getNextVersionInTx(tx, fiscalYearStr);
    return tx.civicDataVersion.create({
      data: {
        fiscalYear: fiscalYearStr,
        version: nextVersion,
        uploadedBy: payload.sub,
        filename: file.name,
        sourceFormat,
        status: "PROCESSING",
        isActive: false,
        ministryCount: 0,
        projectCount: 0,
        redFlagCount: 0,
        notes: notes ?? null,
      },
    });
  });

  try {
    // ── 1. Call parser microservice ─────────────────────────────────────────
    const bytes = Buffer.from(await file.arrayBuffer());
    const parserForm = new FormData();
    parserForm.append("file", new Blob([bytes], { type: file.type }), file.name);
    parserForm.append("fiscal_year", fiscalYearStr);

    let parserRes: Response;
    try {
      parserRes = await fetch(`${PARSER_URL}/parse/government-budget`, {
        method: "POST",
        body: parserForm,
        // 5-minute timeout for large files
        signal: AbortSignal.timeout(300_000),
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : "ไม่สามารถเชื่อมต่อ parser service ได้";
      await prisma.civicDataVersion.update({
        where: { id: versionRecord.id },
        data: { status: "FAILED", errorLog: msg },
      });
      return NextResponse.json({ error: "PARSER_UNAVAILABLE", message: msg }, { status: 503 });
    }

    if (!parserRes.ok) {
      const errBody = await parserRes.json().catch(() => ({ detail: "parse error" }));
      const errMsg: string = errBody.detail ?? JSON.stringify(errBody);
      await prisma.civicDataVersion.update({
        where: { id: versionRecord.id },
        data: { status: "FAILED", errorLog: errMsg },
      });
      return NextResponse.json({ error: "PARSE_FAILED", message: errMsg }, { status: 422 });
    }

    const parseResult = await parserRes.json() as {
      rows: EtlRow[];
      warnings: string[];
      totalRows: number;
    };

    if (!parseResult.rows?.length) {
      const msg = "ไม่พบแถวข้อมูลที่ถูกต้องในไฟล์นี้";
      await prisma.civicDataVersion.update({
        where: { id: versionRecord.id },
        data: { status: "FAILED", errorLog: msg },
      });
      return NextResponse.json({ error: "NO_ROWS", message: msg }, { status: 422 });
    }

    // ── 2 & 3. Resolve replace target + clear old rows + insert new rows ────
    // Wrapped in a single transaction: if anything here throws (including the
    // createMany), the deleteMany and the version-status updates roll back
    // together, so a failed upload can never leave a fiscal year with its old
    // data deleted but no new data inserted (the bug this replaces).
    let replacesVersionId: string | null = null;

    await prisma.$transaction(async (tx) => {
      if (mode === "replace") {
        const existing = await tx.civicDataVersion.findFirst({
          where: { fiscalYear: fiscalYearStr, status: "ACTIVE" },
          orderBy: { uploadedAt: "desc" },
        });
        if (existing) {
          replacesVersionId = existing.id;
          await tx.civicDataVersion.update({
            where: { id: existing.id },
            data: { status: "REPLACED", isActive: false },
          });
        }
        await tx.budgetLineItem.deleteMany({ where: { fiscalYear } });
      }

      // Link version chain for audit trail
      if (replacesVersionId) {
        await tx.civicDataVersion.update({
          where: { id: versionRecord.id },
          data: { replacesVersionId },
        });
      }

      // ── Insert raw BudgetLineItem rows ──────────────────────────────────
      // NOTE: include every BudgetLineItem column the parser produces — a
      // previous version of this mapping silently dropped categoryLv2-6 and
      // itemDescription, losing 7 of the Data Dict's columns on every upload.
      await tx.budgetLineItem.createMany({
        data: parseResult.rows.map((row) => ({
          refDoc: row.refDoc,
          refPageNo: row.refPageNo ?? 0,
          ministry: row.ministry,
          strategy: row.strategy ?? null,
          motherPlan: row.motherPlan ?? null,
          crossFunc: row.crossFunc ?? false,
          budgetaryUnit: row.budgetaryUnit,
          budgetPlan: row.budgetPlan,
          output: row.output ?? null,
          project: row.project ?? null,
          categoryLv1: row.categoryLv1 ?? null,
          categoryLv2: row.categoryLv2 ?? null,
          categoryLv3: row.categoryLv3 ?? null,
          categoryLv4: row.categoryLv4 ?? null,
          categoryLv5: row.categoryLv5 ?? null,
          categoryLv6: row.categoryLv6 ?? null,
          itemDescription: row.itemDescription ?? null,
          fiscalYear: row.fiscalYear ?? fiscalYear,
          amount: row.amount,
          obliged: row.obliged ?? false,
        })),
      });
    }, {
      // Default interactive-transaction timeout is 5s — far too short for
      // government-budget files with tens of thousands of rows (createMany
      // alone can take 10-20s+). Bump both maxWait (time to acquire a DB
      // connection/start the transaction) and timeout (time the transaction
      // body itself is allowed to run) so large uploads don't get killed
      // mid-flight with P2028 "Transaction already closed".
      maxWait: 10_000,
      timeout: 120_000,
    });

    // ── 4. ETL: fetch ALL rows for this year (add mode may have existing rows) ──
    const allRows = await prisma.budgetLineItem.findMany({
      where: { fiscalYear },
    });

    // ── 5. Aggregate → CivicBudgetYear → write JSON → invalidate cache ──────
    // BudgetLineItem.amount comes back as Prisma.Decimal (@db.Decimal(15,2)).
    // EtlRow.amount is a plain `number`, so coerce here — do not cast with `as`.
    const etlRows: EtlRow[] = allRows.map((r) => ({
      ...(r as Omit<typeof r, "amount" | "createdAt">),
      amount: Number(r.amount),
    }));
    const civicYear = await buildAndPersistCivicYear(etlRows, fiscalYear, file.name);

    // Red flags were baked into the JSON by buildAndPersistCivicYear (ETL time).
    // Load from cache now just to count flags for the version record.
    const { getBudgetYear } = await import("@/lib/civic-cache");
    const enriched = getBudgetYear(fiscalYearStr);
    const redFlagCount = enriched ? countRedFlags(enriched) : 0;

    const ministryCount = civicYear.ministries.length;
    const projectCount = civicYear.ministries.reduce(
      (s, m) => s + m.departments.reduce((s2, d) => s2 + d.projects.length, 0),
      0
    );

    // ── 6. Mark version ACTIVE ───────────────────────────────────────────────
    await prisma.civicDataVersion.update({
      where: { id: versionRecord.id },
      data: {
        status: "ACTIVE",
        isActive: true,
        ministryCount,
        projectCount,
        redFlagCount,
      },
    });

    void writeAdminLog({
      adminId: payload.sub,
      action: "CIVIC_UPLOAD",
      targetId: versionRecord.id,
      detail: {
        fiscalYear: fiscalYearStr,
        mode,
        filename: file.name,
        sourceFormat,
        totalRows: parseResult.rows.length,
        ministryCount,
        projectCount,
        redFlagCount,
      },
      ip: clientIp,
    });

    return NextResponse.json(
      {
        ok: true,
        version: { id: versionRecord.id, fiscalYear: fiscalYearStr },
        stats: {
          totalRows: parseResult.rows.length,
          ministryCount,
          projectCount,
          redFlagCount,
        },
        warnings: parseResult.warnings,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[civic-data upload]", err);
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดภายในระบบ";
    // Best-effort status update — if the original error was a DB/connection
    // failure, this can throw too. Don't let that mask the real error or
    // produce an unhandled rejection; just log it and still return 500.
    try {
      await prisma.civicDataVersion.update({
        where: { id: versionRecord.id },
        data: { status: "FAILED", errorLog: msg },
      });
    } catch (updateErr) {
      console.error("[civic-data upload] failed to mark version FAILED:", updateErr);
    }
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
  }
}
