import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN", message: "เฉพาะผู้ดูแลระบบเท่านั้น" }, { status: 403 });
  }

  const versions = await prisma.civicDataVersion.findMany({
    orderBy: [{ fiscalYear: "desc" }, { uploadedAt: "desc" }],
  });

  return NextResponse.json({ versions });
}
