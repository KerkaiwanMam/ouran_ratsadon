import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

/**
 * GET /api/admin/comments?status=PENDING_REVIEW&page=1
 *
 * Returns paginated comment list for admin moderation queue.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.error;

  const url = new URL(req.url);
  const status  = url.searchParams.get("status") ?? "PENDING_REVIEW";
  const page    = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit   = 25;

  const where =
    status === "ALL"
      ? {}
      : { status: status as "VISIBLE" | "PENDING_REVIEW" | "REJECTED" };

  const [total, pendingCount, comments] = await Promise.all([
    prisma.projectComment.count({ where }),
    prisma.projectComment.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.projectComment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
    }),
  ]);

  return NextResponse.json({
    total,
    pending: pendingCount,
    page,
    comments: comments.map((c) => ({
      id:          c.id,
      projectId:   c.projectId,
      body:        c.body,
      status:      c.status,
      createdAt:   c.createdAt,
      authorName:  c.user?.name ?? c.guestName ?? "ไม่ระบุชื่อ",
      isGuest:     !c.userId,
    })),
  });
}
