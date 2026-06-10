import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/business/alerts?unread=true
// Returns alerts for the current user (Pro feature — guests get an empty list).
export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const where: Record<string, unknown> = { userId: payload.sub, dismissed: false };
  if (unreadOnly) where.read = false;

  const alerts = await prisma.alert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.alert.count({
    where: { userId: payload.sub, read: false, dismissed: false },
  });

  return NextResponse.json({ alerts, unreadCount });
}

// PATCH /api/business/alerts
// Mark alerts as read or dismissed.
// Body: { ids: string[], action: "read" | "dismiss" }
export async function PATCH(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const { ids, action } = body ?? {};

  if (!Array.isArray(ids) || !["read", "dismiss"].includes(action)) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "กรุณาระบุ ids และ action" },
      { status: 400 }
    );
  }

  const data =
    action === "read"
      ? { read: true, readAt: new Date() }
      : { dismissed: true };

  await prisma.alert.updateMany({
    where: { userId: payload.sub, id: { in: ids } },
    data,
  });

  return NextResponse.json({ ok: true });
}
