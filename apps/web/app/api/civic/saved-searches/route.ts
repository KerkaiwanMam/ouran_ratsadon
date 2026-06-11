import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

// GET /api/civic/saved-searches
// Returns all saved searches for the current user (requires auth).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const searches = await prisma.savedSearch.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ searches });
}

// POST /api/civic/saved-searches
// Body: { label, filters, resultCount? }
export async function POST(req: NextRequest) {
  // requireAuth (not getCurrentUser) — verifies the user row still exists, so
  // a stale JWT can't reach the SavedSearch insert and trip its userId FK.
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const body = await req.json().catch(() => null);
  const { label, filters, resultCount } = body ?? {};

  if (!label || typeof label !== "string" || !filters) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "กรุณาระบุชื่อและตัวกรอง" },
      { status: 400 }
    );
  }

  const count = await prisma.savedSearch.count({ where: { userId: auth.userId } });
  if (count >= 20) {
    return NextResponse.json(
      { error: "LIMIT_EXCEEDED", message: "บันทึกได้สูงสุด 20 การค้นหา" },
      { status: 429 }
    );
  }

  const search = await prisma.savedSearch.create({
    data: {
      userId: auth.userId,
      label: label.slice(0, 80),
      filters: JSON.stringify(filters),
      resultCount: typeof resultCount === "number" ? resultCount : null,
    },
  });

  return NextResponse.json({ search }, { status: 201 });
}

// DELETE /api/civic/saved-searches?id=xxx
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "กรุณาระบุ id" },
      { status: 400 }
    );
  }

  await prisma.savedSearch.deleteMany({ where: { id, userId: auth.userId } });
  return NextResponse.json({ ok: true });
}
