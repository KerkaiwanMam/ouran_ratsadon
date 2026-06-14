import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { FileSourceFormat } from "@prisma/client";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { validateExtension, ALLOWED_EXTENSIONS } from "@/lib/file-sanitizer";
import { hasFirebase, createSignedUploadUrl } from "@/lib/firebase-storage";

// ─── POST /api/files/presign ─────────────────────────────────────────────────
// Phase 3A — direct-to-storage upload, step 1 of 3 (presign → PUT → confirm).
// Creates a File row (status UPLOADING) and returns instructions for the
// client to upload bytes directly to Firebase Storage (or, in dev without
// Firebase configured, to a local-disk fallback endpoint). The client never
// sends the file body through this Next.js route, avoiding the Vercel
// ~4.5MB body limit.
export async function POST(req: NextRequest) {
  // requireAuth (not getCurrentUser) — verifies the user row still exists and
  // isn't banned, so a stale JWT can't reach the File insert and trip its FK.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  let body: { filename?: string; fileSize?: number; contentType?: string; source_format?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "ไม่สามารถอ่านข้อมูลคำขอได้" },
      { status: 400 }
    );
  }

  const { filename, fileSize, contentType } = body;
  if (!filename || typeof fileSize !== "number" || fileSize <= 0) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "ข้อมูลไฟล์ไม่ครบถ้วน" },
      { status: 400 }
    );
  }

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

  let ext: string;
  try {
    ext = validateExtension(filename);
  } catch (e) {
    return NextResponse.json(
      { error: "INVALID_FILE_TYPE", message: (e as Error).message },
      { status: 415 }
    );
  }

  const maxSize = !sub || sub.plan === "FREE" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
  if (fileSize > maxSize) {
    return NextResponse.json(
      {
        error: "FILE_TOO_LARGE",
        message: `ไฟล์มีขนาดเกิน ${!sub || sub.plan === "FREE" ? "10" : "50"} MB`,
      },
      { status: 413 }
    );
  }

  const rawSourceFormat = body.source_format;
  const sourceFormat: FileSourceFormat =
    typeof rawSourceFormat === "string" && rawSourceFormat in FileSourceFormat
      ? (rawSourceFormat as FileSourceFormat)
      : "EXCEL_TEMPLATE";

  // Sanitize filename for use in the storage key (keep extension, strip path
  // separators / unsafe chars).
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = `business/${auth.userId}/${Date.now()}-${randomUUID()}-${safeName}`;

  const fileRecord = await prisma.file.create({
    data: {
      userId: auth.userId,
      filename,
      fileSize,
      fileType: ext,
      sourceFormat,
      status: "UPLOADING",
      storageKey,
    },
  });

  // Only accept the client's contentType if it's in the allowlist for this
  // extension — it gets baked into the signed URL and stored on the Firebase
  // object, so an arbitrary value (e.g. text/html) must not pass through.
  const allowedTypes = ALLOWED_EXTENSIONS[ext] ?? [];
  const claimedType =
    typeof contentType === "string" ? contentType.split(";")[0].trim() : null;
  const resolvedContentType =
    claimedType && allowedTypes.includes(claimedType)
      ? claimedType
      : allowedTypes[0] ?? "application/octet-stream";

  if (hasFirebase) {
    const { url, contentType: signedContentType } = await createSignedUploadUrl({
      key: storageKey,
      contentType: resolvedContentType,
      expiresInSeconds: 60 * 15, // 15 min — larger files take longer than R2's 5 min
    });
    return NextResponse.json({
      mode: "firebase",
      fileId: fileRecord.id,
      uploadUrl: url,
      contentType: signedContentType,
    });
  }

  // Dev fallback: no Firebase configured — client PUTs raw bytes to a
  // local-disk endpoint that mimics the same presign → upload → confirm flow.
  return NextResponse.json({
    mode: "local",
    fileId: fileRecord.id,
    uploadUrl: `/api/files/${fileRecord.id}/local-upload`,
  });
}
