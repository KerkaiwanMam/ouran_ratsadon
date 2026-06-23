import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { containsMacros } from "@/lib/file-sanitizer";
import { getStoredObjectBytes, deleteStoredObject } from "@/lib/file-storage";
import { hashFileBytes, finalizeFileUpload, type RawTx } from "@/lib/file-processor";
import { parseBusinessFile, ParserError } from "@/lib/parser-client";

// ─── POST /api/files/[id]/confirm ────────────────────────────────────────────
// Phase 3A — direct-to-storage upload, step 3 of 3 (presign → PUT → confirm).
// The client calls this after successfully uploading bytes to Firebase
// Storage (or the local-upload fallback). Fetches the stored object, runs the
// same macro/dedup/leak-detect/categorize pipeline as the legacy direct-upload
// route, and marks the file DONE or ERROR.
//
// Phase 3A #4: if a macro is detected, the Firebase object is deleted
// immediately — a flagged file never sits in the bucket waiting for cleanup.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // requireAuth (not getCurrentUser) — verifies the user row still exists and
  // isn't banned, so a stale JWT can't reach finalizeFileUpload's Transaction
  // inserts and trip their userId FK.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const { id } = await params;
  const fileRecord = await prisma.file.findUnique({ where: { id } });
  if (!fileRecord || fileRecord.userId !== auth.userId) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบไฟล์" },
      { status: 404 }
    );
  }
  if (fileRecord.status !== "UPLOADING") {
    return NextResponse.json(
      { error: "INVALID_STATE", message: "ไฟล์นี้ถูกประมวลผลไปแล้ว" },
      { status: 409 }
    );
  }

  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  let buffer: Buffer;
  try {
    buffer = await getStoredObjectBytes(fileRecord.storageKey);
  } catch (err) {
    console.error("[confirm] failed to fetch uploaded object:", err);
    await prisma.file.update({
      where: { id: fileRecord.id },
      data: { status: "ERROR", errorMessage: "ไม่พบไฟล์ที่อัปโหลด — กรุณาลองอัปโหลดใหม่" },
    });
    return NextResponse.json(
      { error: "OBJECT_NOT_FOUND", message: "ไม่พบไฟล์ที่อัปโหลด — กรุณาลองอัปโหลดใหม่" },
      { status: 422 }
    );
  }

  if (buffer.length === 0) {
    await prisma.file.update({
      where: { id: fileRecord.id },
      data: { status: "ERROR", errorMessage: "ไฟล์ว่างเปล่า" },
    });
    return NextResponse.json({ error: "INVALID_INPUT", message: "ไฟล์ว่างเปล่า" }, { status: 400 });
  }

  // ── Plan-based size cap ──────────────────────────────────────────────────
  // Firebase signed PUT URLs (unlike R2's presigned POST) have no
  // content-length-range condition, so the plan's size limit can't be
  // enforced at the storage layer — check it here instead.
  const sub = await prisma.subscription.findUnique({ where: { userId: auth.userId } });
  const maxSize = !sub || sub.plan === "FREE" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
  if (buffer.length > maxSize) {
    await deleteStoredObject(fileRecord.storageKey);
    const message = `ไฟล์มีขนาดเกิน ${maxSize / (1024 * 1024)} MB`;
    await prisma.file.update({
      where: { id: fileRecord.id },
      data: { status: "ERROR", errorMessage: message },
    });
    return NextResponse.json({ error: "FILE_TOO_LARGE", message }, { status: 413 });
  }

  // ── XLSX macro (VBA) detection — delete from storage immediately ─────────
  if (fileRecord.fileType === "xlsx" || fileRecord.fileType === "xls") {
    if (containsMacros(buffer)) {
      await deleteStoredObject(fileRecord.storageKey);
      await prisma.file.update({
        where: { id: fileRecord.id },
        data: {
          status: "ERROR",
          errorMessage: "ไฟล์นี้มี Macro (VBA) ซึ่งไม่อนุญาต",
        },
      });
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

  // ── File-level dedup: byte-identical re-upload ────────────────────────────
  if (!force) {
    const existingFile = await prisma.file.findFirst({
      where: { userId: auth.userId, fileHash, NOT: { id: fileRecord.id } },
      orderBy: { uploadedAt: "desc" },
    });
    if (existingFile) {
      await deleteStoredObject(fileRecord.storageKey);
      await prisma.file.update({
        where: { id: fileRecord.id },
        data: { status: "ERROR", errorMessage: "ไฟล์ซ้ำกับไฟล์ที่เคยอัปโหลดไว้แล้ว", fileHash },
      });
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

  // Atomic claim: only the request that flips UPLOADING → PROCESSING proceeds.
  // The status check at the top is not enough — two concurrent confirms could
  // both pass it and double-insert transactions. updateMany with the status in
  // the WHERE makes the transition itself the lock.
  const claimed = await prisma.file.updateMany({
    where: { id: fileRecord.id, status: "UPLOADING" },
    data: { status: "PROCESSING", fileHash },
  });
  if (claimed.count === 0) {
    return NextResponse.json(
      { error: "INVALID_STATE", message: "ไฟล์นี้ถูกประมวลผลไปแล้ว" },
      { status: 409 }
    );
  }

  // Send the uploaded file to the parser microservice for real parsing.
  let transactions: RawTx[];
  try {
    transactions = await parseBusinessFile(buffer, fileRecord.filename, fileRecord.sourceFormat, fileRecord.fileType);
  } catch (err) {
    const code = err instanceof ParserError ? err.code : "PARSE_ERROR";
    const message = err instanceof ParserError ? err.userMessage : "ไม่สามารถประมวลผลไฟล์ได้";
    await prisma.file.update({
      where: { id: fileRecord.id },
      data: { status: "ERROR", errorMessage: message },
    });
    console.error("[confirm parse]", err);
    return NextResponse.json(
      { error: code, message },
      { status: code === "PARSER_UNAVAILABLE" ? 503 : 422 }
    );
  }

  try {
    const result = await finalizeFileUpload(fileRecord, transactions, auth.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    await prisma.file.update({
      where: { id: fileRecord.id },
      data: { status: "ERROR", errorMessage: "ไม่สามารถประมวลผลไฟล์ได้" },
    });
    console.error("[confirm finalize]", err);
    return NextResponse.json(
      { error: "PARSE_ERROR", message: "ไม่สามารถประมวลผลไฟล์ได้" },
      { status: 422 }
    );
  }
}
