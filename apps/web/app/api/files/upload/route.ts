import { NextRequest, NextResponse } from "next/server";
import { FileSourceFormat } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  hashFileBytes,
  finalizeFileUpload,
  generateMockTransactions,
} from "@/lib/file-processor";
import {
  validateExtension,
  warnOnSuspiciousMime,
  containsMacros,
} from "@/lib/file-sanitizer";

// ─── Duplicate-file detection ───────────────────────────────────────────────
// See docs/feature-specs.md → "Duplicate file & re-upload handling" for the
// full design rationale. File-level: SHA-256 of the raw bytes — catches "I
// dragged the exact same file in again" before we even re-parse it. Row-level
// dedup happens inside finalizeFileUpload() (lib/file-processor.ts).

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // requireAuth (not getCurrentUser) — verifies the user row still exists and
  // isn't banned, so a stale JWT can't reach the File/Transaction inserts and
  // trip their FKs.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  // Check Free plan quota (3 files/month)
  const sub = await prisma.subscription.findUnique({ where: { userId: auth.userId } });
  if (!sub || sub.plan === "FREE") {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    // ERROR files don't count — a failed/abandoned upload shouldn't burn the
    // user's monthly quota (orphan-cleaner marks stale UPLOADING rows ERROR).
    const count = await prisma.file.count({
      where: { userId: auth.userId, uploadedAt: { gte: monthStart }, status: { not: "ERROR" } },
    });
    if (count >= 3) {
      return NextResponse.json(
        {
          error: "QUOTA_EXCEEDED",
          message: "ใช้ครบ 3 ไฟล์/เดือนสำหรับแผน Free แล้ว กรุณาอัปเกรดเป็น Pro",
        },
        { status: 429 }
      );
    }
  }

  // ── Fix #3: Pre-upload validation BEFORE reading body into memory ─────────
  // Check Content-Length header first — reject oversized requests before
  // streaming the body. Vercel enforces a 4.5 MB body limit on the /api route
  // so in practice this is a belt-and-suspenders guard for when we migrate to
  // R2 presigned URLs (no body size limit from the gateway).
  const maxSize = !sub || sub.plan === "FREE" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > maxSize) {
    return NextResponse.json(
      {
        error: "FILE_TOO_LARGE",
        message: `ไฟล์มีขนาดเกิน ${!sub || sub.plan === "FREE" ? "10" : "50"} MB`,
      },
      { status: 413 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "ไม่สามารถอ่านข้อมูลไฟล์ได้" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "กรุณาเลือกไฟล์" },
      { status: 400 }
    );
  }

  // ── Fix #3: Extension whitelist (before reading bytes) ────────────────────
  let ext: string;
  try {
    ext = validateExtension(file.name);
  } catch (e) {
    return NextResponse.json(
      { error: "INVALID_FILE_TYPE", message: (e as Error).message },
      { status: 415 }
    );
  }

  // Log suspicious MIME mismatches but don't hard-reject (browser inconsistency)
  const mimeCheck = warnOnSuspiciousMime(ext, file.type);
  if (mimeCheck.suspicious) {
    console.warn(`[upload] Suspicious MIME for ${file.name}: ${mimeCheck.reason}`);
  }

  // Double-check declared size now that we have the File object
  if (file.size > maxSize) {
    return NextResponse.json(
      {
        error: "FILE_TOO_LARGE",
        message: `ไฟล์มีขนาดเกิน ${!sub || sub.plan === "FREE" ? "10" : "50"} MB`,
      },
      { status: 413 }
    );
  }

  // source_format comes from the client form — validate against the Prisma
  // enum instead of blind-casting; unknown values fall back to EXCEL_TEMPLATE.
  const rawSourceFormat = formData.get("source_format");
  const sourceFormat: FileSourceFormat =
    typeof rawSourceFormat === "string" && rawSourceFormat in FileSourceFormat
      ? (rawSourceFormat as FileSourceFormat)
      : "EXCEL_TEMPLATE";
  const force = formData.get("force") === "true";

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // ── Fix #2: XLSX macro (VBA) detection ────────────────────────────────────
  if (ext === "xlsx" || ext === "xls") {
    if (containsMacros(buffer)) {
      return NextResponse.json(
        {
          error: "MACRO_DETECTED",
          message: "ไฟล์นี้มี Macro (VBA) ซึ่งไม่อนุญาต — กรุณาบันทึกเป็น .xlsx ปกติ (ไม่มี macro) แล้วอัปโหลดใหม่",
        },
        { status: 422 }
      );
    }
  }
  const fileHash = hashFileBytes(buffer);

  // ── 1. File-level dedup: byte-identical re-upload ──────────────────────
  // If the user drags in literally the same file again, don't re-parse and
  // re-store it — tell them about the existing copy and let them confirm a
  // forced re-import (e.g. they want to retry after an ERROR status).
  if (!force) {
    const existingFile = await prisma.file.findFirst({
      where: { userId: auth.userId, fileHash },
      orderBy: { uploadedAt: "desc" },
    });
    if (existingFile) {
      return NextResponse.json(
        {
          error: "DUPLICATE_FILE",
          message: `ไฟล์นี้เหมือนกับไฟล์ "${existingFile.filename}" ที่อัปโหลดไปแล้วเมื่อ ${existingFile.uploadedAt.toISOString()} (${existingFile.transactionCount ?? 0} รายการ) ต้องการอัปโหลดซ้ำหรือไม่?`,
          existingFile: {
            id: existingFile.id,
            filename: existingFile.filename,
            uploadedAt: existingFile.uploadedAt,
            transactionCount: existingFile.transactionCount,
            status: existingFile.status,
          },
        },
        { status: 409 }
      );
    }
  }

  // Save to disk. Sanitize the client-controlled filename before it becomes
  // part of a filesystem path — a crafted name like "a/../../evil.csv" would
  // otherwise escape uploads/ via path.join (same rule as the presign route).
  const uploadsDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = `${Date.now()}-${safeName}`;
  const filePath = path.join(uploadsDir, storageKey);
  await writeFile(filePath, buffer);

  // Create file record
  const fileRecord = await prisma.file.create({
    data: {
      userId: auth.userId,
      filename: file.name,
      fileSize: file.size,
      fileType: ext,
      sourceFormat,
      status: "PROCESSING",
      storageKey,
      fileHash,
    },
  });

  // For Phase 0, parse is simulated — generate mock transactions from the file
  // In production this would call the Python parser microservice
  try {
    const mockTransactions = generateMockTransactions(file.name, auth.userId, fileRecord.id);
    const result = await finalizeFileUpload(fileRecord, mockTransactions, auth.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    await prisma.file.update({
      where: { id: fileRecord.id },
      data: { status: "ERROR", errorMessage: "ไม่สามารถประมวลผลไฟล์ได้" },
    });
    console.error("[upload parse]", err);
    return NextResponse.json(
      { error: "PARSE_ERROR", message: "ไม่สามารถประมวลผลไฟล์ได้" },
      { status: 422 }
    );
  }
}
