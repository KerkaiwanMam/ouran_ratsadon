import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { containsMacros } from "@/lib/file-sanitizer";
import { getStoredObjectBytes, deleteStoredObject } from "@/lib/file-storage";
import { hashFileBytes, finalizeFileUpload, generateMockTransactions } from "@/lib/file-processor";

// ─── POST /api/files/[id]/confirm ────────────────────────────────────────────
// Phase 3A — direct-to-storage upload, step 3 of 3 (presign → PUT → confirm).
// The client calls this after successfully uploading bytes to R2 (or the
// local-upload fallback). Fetches the stored object, runs the same
// macro/dedup/leak-detect/categorize pipeline as the legacy direct-upload
// route, and marks the file DONE or ERROR.
//
// Phase 3A #4: if a macro is detected, the R2 object is deleted immediately —
// a flagged file never sits in the bucket waiting for cleanup.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const fileRecord = await prisma.file.findUnique({ where: { id } });
  if (!fileRecord || fileRecord.userId !== payload.sub) {
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
      where: { userId: payload.sub, fileHash, NOT: { id: fileRecord.id } },
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

  // For Phase 0, parse is simulated — generate mock transactions from the file
  // In production this would call the Python parser microservice
  try {
    const mockTransactions = generateMockTransactions(fileRecord.filename, payload.sub, fileRecord.id);
    const result = await finalizeFileUpload(fileRecord, mockTransactions, payload.sub);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    await prisma.file.update({
      where: { id: fileRecord.id },
      data: { status: "ERROR", errorMessage: "ไม่สามารถประมวลผลไฟล์ได้" },
    });
    console.error("[confirm parse]", err);
    return NextResponse.json(
      { error: "PARSE_ERROR", message: "ไม่สามารถประมวลผลไฟล์ได้" },
      { status: 422 }
    );
  }
}
