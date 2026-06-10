import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * POST /api/workspace/join
 * Body: { token: string }
 *
 * Accepts a workspace invite token. The user must be logged in.
 * Sets member status from INVITED → ACTIVE and clears the invite token.
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const body = await req.json() as { token?: string };
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "ไม่พบ token การเชิญ" },
      { status: 400 }
    );
  }

  // Find the invite
  const member = await prisma.workspaceMember.findUnique({
    where: { inviteToken: token },
    include: {
      workspace: { select: { id: true, name: true } },
    },
  });

  if (!member) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ลิงก์เชิญไม่ถูกต้องหรือหมดอายุแล้ว" },
      { status: 404 }
    );
  }

  if (member.status !== "INVITED") {
    return NextResponse.json(
      { error: "CONFLICT", message: "ลิงก์เชิญนี้ถูกใช้ไปแล้ว" },
      { status: 409 }
    );
  }

  // Verify the invite email matches (or is open — some invites are by email only)
  if (member.email && member.email.toLowerCase() !== auth.email.toLowerCase()) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "การเชิญนี้ไม่ได้ส่งให้บัญชีของคุณ" },
      { status: 403 }
    );
  }

  // Accept the invite
  await prisma.workspaceMember.update({
    where: { id: member.id },
    data: {
      status: "ACTIVE",
      userId: auth.userId,
      inviteToken: null,
    },
  });

  return NextResponse.json({
    workspaceId:   member.workspace.id,
    workspaceName: member.workspace.name,
  });
}
