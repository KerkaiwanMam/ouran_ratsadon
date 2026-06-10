import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_VOTES = ["too_high", "appropriate", "too_low"] as const;
type Vote = (typeof VALID_VOTES)[number];

function hashIp(ip: string): string {
  return createHash("sha256").update(ip + (process.env.IP_SALT ?? "civic")).digest("hex").slice(0, 32);
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// GET /api/civic/project/[id]/rating
// Returns aggregate vote counts for this project.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;

  const rows = await prisma.projectRating.groupBy({
    by: ["vote"],
    where: { projectId },
    _count: { vote: true },
  });

  const counts: Record<string, number> = { too_high: 0, appropriate: 0, too_low: 0 };
  let total = 0;
  for (const row of rows) {
    counts[row.vote] = row._count.vote;
    total += row._count.vote;
  }

  return NextResponse.json({ projectId, total, counts });
}

// POST /api/civic/project/[id]/rating
// Body: { vote: "too_high" | "appropriate" | "too_low" }
// One vote per project per user (or per IP for guests).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;

  const body = await req.json().catch(() => null);
  const vote = body?.vote as Vote | undefined;

  if (!vote || !VALID_VOTES.includes(vote)) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "vote ต้องเป็น too_high, appropriate, หรือ too_low" },
      { status: 400 }
    );
  }

  const payload = await getCurrentUser();
  const ipHash = hashIp(getClientIp(req));

  try {
    if (payload) {
      // Authenticated: upsert by userId
      await prisma.projectRating.upsert({
        where: { projectId_userId: { projectId, userId: payload.sub } },
        create: { projectId, userId: payload.sub, vote, ipHash },
        update: { vote },
      });
    } else {
      // Guest: upsert by ipHash
      await prisma.projectRating.upsert({
        where: { projectId_ipHash: { projectId, ipHash } },
        create: { projectId, vote, ipHash },
        update: { vote },
      });
    }
  } catch {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500 }
    );
  }

  // Return updated counts
  const rows = await prisma.projectRating.groupBy({
    by: ["vote"],
    where: { projectId },
    _count: { vote: true },
  });

  const counts: Record<string, number> = { too_high: 0, appropriate: 0, too_low: 0 };
  let total = 0;
  for (const row of rows) {
    counts[row.vote] = row._count.vote;
    total += row._count.vote;
  }

  return NextResponse.json({ projectId, total, counts, myVote: vote });
}
