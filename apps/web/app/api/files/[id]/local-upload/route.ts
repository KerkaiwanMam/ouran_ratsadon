import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ─── PUT /api/files/[id]/local-upload ────────────────────────────────────────
// Dev-only fallback for the presign flow when R2 is not configured: the
// client PUTs the raw file bytes here (mirroring a presigned PUT to R2), and
// they're written to the local uploads/ dir under the storageKey assigned by
// /api/files/presign. Never used when R2 env vars are set.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      { error: "INVALID_STATE", message: "ไฟล์นี้ถูกอัปโหลดไปแล้ว" },
      { status: 409 }
    );
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: payload.sub } });
  const maxSize = !sub || sub.plan === "FREE" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;

  const bytes = await req.arrayBuffer();
  if (bytes.byteLength === 0) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "ไฟล์ว่างเปล่า" },
      { status: 400 }
    );
  }
  if (bytes.byteLength > maxSize) {
    return NextResponse.json(
      {
        error: "FILE_TOO_LARGE",
        message: `ไฟล์มีขนาดเกิน ${!sub || sub.plan === "FREE" ? "10" : "50"} MB`,
      },
      { status: 413 }
    );
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  const filePath = path.join(uploadsDir, fileRecord.storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(bytes));

  return NextResponse.json({ ok: true });
}
