import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { generateToken } from "@/lib/tokens";

const TEAM_SEAT_LIMIT = 5;

// ─── GET /api/workspace — list workspaces the current user belongs to ─────────

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId: auth.userId,
      status: "ACTIVE",
    },
    include: {
      workspace: {
        include: {
          _count: { select: { members: true, files: true } },
        },
      },
    },
    orderBy: { workspace: { createdAt: "asc" } },
  });

  const ownedWorkspaces = await prisma.workspace.findMany({
    where: { ownerId: auth.userId },
    include: { _count: { select: { members: true, files: true } } },
  });

  return NextResponse.json({
    owned: ownedWorkspaces,
    member: memberships
      .filter((m) => m.workspace.ownerId !== auth.userId)
      .map((m) => ({ ...m.workspace, role: m.role })),
  });
}

// ─── POST /api/workspace — create a new workspace ────────────────────────────

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  // Only Team plan users can create workspaces
  const sub = await prisma.subscription.findUnique({
    where: { userId: auth.userId },
  });
  if (sub?.plan !== "TEAM") {
    return NextResponse.json(
      { error: "PLAN_REQUIRED", message: "การสร้าง Workspace ต้องการแพ็คเกจ Team (฿799/เดือน)" },
      { status: 403 }
    );
  }

  const body = await req.json() as { name?: string; slug?: string; description?: string };
  const { name, slug, description } = body;

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "name และ slug จำเป็น" },
      { status: 400 }
    );
  }

  // Validate slug
  if (!/^[a-z0-9-]{3,40}$/.test(slug.trim())) {
    return NextResponse.json(
      { error: "INVALID_SLUG", message: "slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และ - เท่านั้น (3-40 ตัว)" },
      { status: 400 }
    );
  }

  // Check slug uniqueness
  const existing = await prisma.workspace.findUnique({ where: { slug: slug.trim() } });
  if (existing) {
    return NextResponse.json(
      { error: "SLUG_TAKEN", message: "ชื่อย่อ (slug) นี้ถูกใช้แล้ว" },
      { status: 409 }
    );
  }

  const workspace = await prisma.workspace.create({
    data: {
      name:        name.trim(),
      slug:        slug.trim(),
      description: description?.trim() ?? null,
      ownerId:     auth.userId,
      members: {
        create: {
          userId: auth.userId,
          email:  auth.email,
          role:   "OWNER",
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      },
    },
    include: { _count: { select: { members: true } } },
  });

  return NextResponse.json({ workspace }, { status: 201 });
}
