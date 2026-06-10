import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/business/leaks
// Returns all flagged transactions for the current user, sorted by severity.
// Query params:
//   flag   = SPIKE | DUPLICATE | OUTLIER | CREEP (all flags if omitted)
//   fileId = filter to a specific uploaded file
//   page   = 1-based page number (default 1, page size 20)
export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  // Pro-only feature gate
  const sub = await prisma.subscription.findUnique({ where: { userId: payload.sub } });
  const isPro =
    sub &&
    (sub.plan === "PRO" || sub.plan === "TEAM") &&
    (sub.status === "ACTIVE" || sub.status === "TRIAL");

  if (!isPro) {
    return NextResponse.json(
      { error: "PLAN_REQUIRED", message: "ฟีเจอร์นี้สำหรับสมาชิก Pro ขึ้นไปเท่านั้น" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const flagFilter = searchParams.get("flag");
  const fileId = searchParams.get("fileId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 20;

  const where: Record<string, unknown> = {
    userId: payload.sub,
    NOT: { leakFlag: "NONE" },
  };
  // Validate against the LeakFlag enum — an arbitrary string here would make
  // Prisma throw (leakFlag is an enum column), turning bad input into a 500.
  if (flagFilter && ["SPIKE", "DUPLICATE", "OUTLIER", "CREEP"].includes(flagFilter)) {
    where.leakFlag = flagFilter;
  }
  if (fileId) where.fileId = fileId;

  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: [
        // CRITICAL first, then WARNING
        { leakSeverity: "desc" },
        { date: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        date: true,
        description: true,
        amount: true,
        transactionType: true,
        category: true,
        leakFlag: true,
        leakSeverity: true,
        leakReason: true,
        file: { select: { id: true, filename: true } },
      },
    }),
  ]);

  // Aggregate counts by flag type for the filter pills
  const flagCounts = await prisma.transaction.groupBy({
    by: ["leakFlag"],
    where: { userId: payload.sub, NOT: { leakFlag: "NONE" } },
    _count: { leakFlag: true },
  });

  return NextResponse.json({
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
    flagCounts: Object.fromEntries(flagCounts.map((r) => [r.leakFlag, r._count.leakFlag])),
    items: rows.map((t) => ({
      ...t,
      date: t.date.toISOString().slice(0, 10),
    })),
  });
}
