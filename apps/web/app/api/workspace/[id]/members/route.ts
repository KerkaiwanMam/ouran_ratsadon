import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { generateToken } from "@/lib/tokens";
import { sendWorkspaceInviteEmail } from "@/lib/email";

const TEAM_SEAT_LIMIT = 5;

// ─── GET /api/workspace/[id]/members ─────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  // Must be a member of the workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: auth.userId, status: "ACTIVE" },
  });
  if (!membership) {
    return NextResponse.json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: [{ status: "asc" }, { joinedAt: "asc" }],
  });

  return NextResponse.json({ members });
}

// ─── POST /api/workspace/[id]/members — invite a new member ──────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  // Must be OWNER or ADMIN
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: auth.userId, status: "ACTIVE" },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "FORBIDDEN", message: "ต้องเป็น Owner หรือ Admin" }, { status: 403 });
  }

  const body = await req.json() as { email?: string; role?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "email จำเป็น" }, { status: 400 });
  }

  // Check seat limit
  const activeCount = await prisma.workspaceMember.count({
    where: { workspaceId, status: { in: ["ACTIVE", "INVITED"] } },
  });
  if (activeCount >= TEAM_SEAT_LIMIT) {
    return NextResponse.json(
      { error: "SEAT_LIMIT", message: `Team plan รองรับสูงสุด ${TEAM_SEAT_LIMIT} คน` },
      { status: 422 }
    );
  }

  // Check not already a member
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_email: { workspaceId, email } },
  });
  if (existing) {
    return NextResponse.json({ error: "ALREADY_MEMBER", message: "อีเมลนี้เป็นสมาชิกแล้ว" }, { status: 409 });
  }

  const inviteToken = generateToken(32);
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      email,
      role:        (body.role as "ADMIN" | "MEMBER") ?? "MEMBER",
      status:      "INVITED",
      inviteToken,
    },
  });

  // Send invite email (fire-and-forget, graceful if Resend not configured)
  void sendWorkspaceInviteEmail({
    toEmail:       email,
    workspaceName: workspace?.name ?? "Workspace",
    inviteToken,
    inviterName:   auth.name ?? "ทีมงาน",
  }).catch((e) => console.error("[workspace invite email]", e));

  return NextResponse.json({ member }, { status: 201 });
}
