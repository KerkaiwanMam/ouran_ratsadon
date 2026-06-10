import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  const files = await prisma.file.findMany({
    where: { userId: payload.sub },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      filename: true,
      fileSize: true,
      fileType: true,
      sourceFormat: true,
      status: true,
      errorMessage: true,
      periodStart: true,
      periodEnd: true,
      transactionCount: true,
      totalIncome: true,
      totalExpense: true,
      uploadedAt: true,
      processedAt: true,
      _count: { select: { alerts: true } },
    },
  });

  return NextResponse.json({
    total: files.length,
    // File.totalIncome/totalExpense are Prisma.Decimal — coerce to number so
    // JSON.stringify emits a number, not the Decimal's string representation.
    files: files.map((f) => ({
      ...f,
      totalIncome: f.totalIncome != null ? Number(f.totalIncome) : null,
      totalExpense: f.totalExpense != null ? Number(f.totalExpense) : null,
      leakCount: f._count.alerts,
      _count: undefined,
    })),
  });
}
