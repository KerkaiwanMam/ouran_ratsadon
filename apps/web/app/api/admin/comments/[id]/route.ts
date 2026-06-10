import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

/**
 * PATCH /api/admin/comments/[id]
 * Body: { action: "approve" | "reject" }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.error;

  const body = await req.json() as { action?: string };
  const action = body.action;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "action ต้องเป็น approve หรือ reject" },
      { status: 400 }
    );
  }

  const status = action === "approve" ? "VISIBLE" : "REJECTED";

  const comment = await prisma.projectComment.update({
    where: { id },
    data: {
      status,
      moderatedBy: auth.userId,
      moderatedAt: new Date(),
    },
  });

  return NextResponse.json({ comment: { id: comment.id, status: comment.status } });
}
