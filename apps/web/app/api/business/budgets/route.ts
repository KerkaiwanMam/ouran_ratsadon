import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/business/budgets?month=2025-06
// Returns the user's budget targets for the given month (falls back to standing budgets).
export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // e.g. "2025-06"

  const budgets = await prisma.budget.findMany({
    where: {
      userId: payload.sub,
      OR: [{ month }, { month: null }],
    },
    orderBy: { category: "asc" },
  });

  // Month-specific overrides win over standing budgets
  const byCategory = new Map<string, (typeof budgets)[0]>();
  for (const b of budgets.filter((b) => b.month === null)) byCategory.set(b.category, b);
  for (const b of budgets.filter((b) => b.month !== null)) byCategory.set(b.category, b);

  return NextResponse.json({ budgets: Array.from(byCategory.values()) });
}

// POST /api/business/budgets
// Upsert a budget target for a category (standing or month-specific).
// Body: { category, amount, month? }
export async function POST(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const { category, amount, month = null } = body ?? {};

  if (!category || typeof amount !== "number" || amount < 0) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "กรุณาระบุหมวดหมู่และงบประมาณที่ถูกต้อง" },
      { status: 400 }
    );
  }

  const budget = await prisma.budget.upsert({
    where: { userId_category_month: { userId: payload.sub, category, month } },
    create: { userId: payload.sub, category, amount, month },
    update: { amount },
  });

  return NextResponse.json({ budget }, { status: 200 });
}

// DELETE /api/business/budgets?category=บุคลากร&month=2025-06
export async function DELETE(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const month = searchParams.get("month") ?? null;

  if (!category) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "กรุณาระบุหมวดหมู่" },
      { status: 400 }
    );
  }

  await prisma.budget.deleteMany({
    where: { userId: payload.sub, category, month },
  });

  return NextResponse.json({ ok: true });
}
