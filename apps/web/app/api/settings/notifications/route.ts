import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * GET /api/settings/notifications
 * Returns the current user's notification settings.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { lineNotifyToken: true },
  });

  return NextResponse.json({
    // Don't expose the actual token — just whether it's set
    lineNotifyToken: user?.lineNotifyToken ? "***" : null,
    emailAlerts: true, // always on for now
  });
}

/**
 * PATCH /api/settings/notifications
 * Body: { lineNotifyToken: string | null }
 *
 * Updates the current user's notification settings.
 */
export async function PATCH(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const body = await req.json() as { lineNotifyToken?: string | null };

  // Validate token format if provided (LINE Notify tokens are 43 hex/alphanumeric chars)
  if (body.lineNotifyToken !== undefined && body.lineNotifyToken !== null) {
    const token = body.lineNotifyToken.trim();
    if (token.length < 10 || token.length > 200) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "LINE Notify Token ไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    await prisma.user.update({
      where: { id: auth.userId },
      data: { lineNotifyToken: token },
    });
  } else {
    await prisma.user.update({
      where: { id: auth.userId },
      data: { lineNotifyToken: null },
    });
  }

  return NextResponse.json({ ok: true });
}
