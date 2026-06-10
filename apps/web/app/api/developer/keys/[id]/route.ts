import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * DELETE /api/developer/keys/[id]
 * Revokes (soft-deletes) an API key.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const key = await prisma.apiKey.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!key) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบ API key" },
      { status: 404 }
    );
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revoked: true },
  });

  return NextResponse.json({ ok: true });
}
