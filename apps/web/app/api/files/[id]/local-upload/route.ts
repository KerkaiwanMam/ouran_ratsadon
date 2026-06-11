import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { resolveLocalStoragePath } from "@/lib/file-storage";

// ─── PUT /api/files/[id]/local-upload ────────────────────────────────────────
// Dev-only fallback for the presign flow when R2 is not configured: the
// client PUTs the raw file bytes here (mirroring a presigned PUT to R2), and
// they're written to the local uploads/ dir under the storageKey assigned by
// /api/files/presign. Never used when R2 env vars are set.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // requireAuth for parity with the rest of the upload flow (presign/confirm):
  // stale-JWT and banned users are rejected before any bytes hit the disk.
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
      { error: "INVALID_STATE", message: "ไฟล์นี้ถูกอัปโหลดไปแล้ว" },
      { status: 409 }
    );
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: auth.userId } });
  const maxSize = !sub || sub.plan === "FREE" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;

  // Pre-upload validation: reject oversized requests via Content-Length BEFORE
  // reading the body into memory — same guard as the legacy upload route
  // (see "Pre-upload validation" in CLAUDE.md security status).
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

  // resolveLocalStoragePath rejects any key that escapes uploads/ —
  // storageKey is server-generated, this is defense-in-depth.
  const filePath = resolveLocalStoragePath(fileRecord.storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(bytes));

  return NextResponse.json({ ok: true });
}
