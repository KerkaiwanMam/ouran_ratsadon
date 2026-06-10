import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidateYear } from "@/lib/civic-cache";
import { writeAdminLog } from "@/lib/admin-audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN", message: "เฉพาะผู้ดูแลระบบเท่านั้น" }, { status: 403 });
  }

  const { id } = await params;

  const version = await prisma.civicDataVersion.findUnique({ where: { id } });
  if (!version) {
    return NextResponse.json({ error: "NOT_FOUND", message: "ไม่พบเวอร์ชันที่ระบุ" }, { status: 404 });
  }

  // If this is the active version, also remove the raw rows and JSON file
  if (version.status === "ACTIVE") {
    const fiscalYear = parseInt(version.fiscalYear, 10);
    if (!isNaN(fiscalYear)) {
      await prisma.budgetLineItem.deleteMany({ where: { fiscalYear } });
    }
    const dataFile = path.join(process.cwd(), "data", `budget-${version.fiscalYear}.json`);
    try { await fs.unlink(dataFile); } catch { /* may not exist */ }
    invalidateYear(version.fiscalYear);
  }

  await prisma.civicDataVersion.update({
    where: { id },
    data: { status: "DELETED", isActive: false },
  });

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  void writeAdminLog({
    adminId: payload.sub,
    action: "CIVIC_DELETE",
    targetId: id,
    detail: { fiscalYear: version.fiscalYear, version: version.version, filename: version.filename },
    ip: clientIp,
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN", message: "เฉพาะผู้ดูแลระบบเท่านั้น" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { notes?: string };

  const version = await prisma.civicDataVersion.update({
    where: { id },
    data: { notes: body.notes ?? null },
  }).catch(() => null);

  if (!version) {
    return NextResponse.json({ error: "NOT_FOUND", message: "ไม่พบเวอร์ชันที่ระบุ" }, { status: 404 });
  }

  void writeAdminLog({
    adminId: payload.sub,
    action: "CIVIC_NOTES_EDIT",
    targetId: id,
    detail: { notes: body.notes ?? null },
  });

  return NextResponse.json({ ok: true, version });
}
