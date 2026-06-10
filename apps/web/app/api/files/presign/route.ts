import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { FileSourceFormat } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateExtension, ALLOWED_EXTENSIONS } from "@/lib/file-sanitizer";
import { hasR2, createPresignedUploadPost } from "@/lib/r2";

// ─── POST /api/files/presign ─────────────────────────────────────────────────
// Phase 3A — direct-to-storage upload, step 1 of 3 (presign → PUT → confirm).
// Creates a File row (status UPLOADING) and returns instructions for the
// client to upload bytes directly to Cloudflare R2 (or, in dev without R2
// configured, to a local-disk fallback endpoint). The client never sends the
// file body through this Next.js route, avoiding the Vercel ~4.5MB body limit.
export async function POST(req: NextRequest) {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

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
  const sub = await prisma.subscription.findUnique({ where: { userId: payload.sub } });
  if (!sub || sub.plan === "FREE") {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const count = await prisma.file.count({
      where: { userId: payload.sub, uploadedAt: { gte: monthStart } },
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
  const storageKey = `business/${payload.sub}/${Date.now()}-${randomUUID()}-${safeName}`;

  const fileRecord = await prisma.file.create({
    data: {
      userId: payload.sub,
      filename,
      fileSize,
      fileType: ext,
      sourceFormat,
      status: "UPLOADING",
      storageKey,
    },
  });

  const resolvedContentType =
    contentType && typeof contentType === "string"
      ? contentType
      : ALLOWED_EXTENSIONS[ext]?.[0] ?? "application/octet-stream";

  if (hasR2) {
    const presigned = await createPresignedUploadPost({
      key: storageKey,
      contentType: resolvedContentType,
      maxSizeBytes: maxSize,
    });
    return NextResponse.json({
      mode: "r2",
      fileId: fileRecord.id,
      url: presigned.url,
      fields: presigned.fields,
    });
  }

  // Dev fallback: no R2 configured — client PUTs raw bytes to a local-disk
  // endpoint that mimics the same presign → upload → confirm flow.
  return NextResponse.json({
    mode: "local",
    fileId: fileRecord.id,
    uploadUrl: `/api/files/${fileRecord.id}/local-upload`,
  });
}
