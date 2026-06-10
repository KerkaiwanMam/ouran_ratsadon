import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/civic/saved-searches
// Returns all saved searches for the current user (requires auth).
export async function GET() {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const searches = await prisma.savedSearch.findMany({
    where: { userId: payload.sub },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ searches });
}

// POST /api/civic/saved-searches
// Body: { label, filters, resultCount? }
export async function POST(req: NextRequest) {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const { label, filters, resultCount } = body ?? {};

  if (!label || typeof label !== "string" || !filters) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "กรุณาระบุชื่อและตัวกรอง" },
      { status: 400 }
    );
  }

  const count = await prisma.savedSearch.count({ where: { userId: payload.sub } });
  if (count >= 20) {
    return NextResponse.json(
      { error: "LIMIT_EXCEEDED", message: "บันทึกได้สูงสุด 20 การค้นหา" },
      { status: 429 }
    );
  }

  const search = await prisma.savedSearch.create({
    data: {
      userId: payload.sub,
      label: label.slice(0, 80),
      filters: JSON.stringify(filters),
      resultCount: typeof resultCount === "number" ? resultCount : null,
    },
  });

  return NextResponse.json({ search }, { status: 201 });
}

// DELETE /api/civic/saved-searches?id=xxx
export async function DELETE(req: NextRequest) {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "กรุณาระบุ id" },
      { status: 400 }
    );
  }

  await prisma.savedSearch.deleteMany({ where: { id, userId: payload.sub } });
  return NextResponse.json({ ok: true });
}
