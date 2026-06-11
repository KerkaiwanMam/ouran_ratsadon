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
  // Path segment may arrive percent-encoded (Thai project ids) — decode so
  // ratings are keyed by the same id form as every other civic route.
  const { id: rawId } = await params;
  const projectId = decodeURIComponent(rawId);

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
  const { id: rawId } = await params;
  const projectId = decodeURIComponent(rawId);

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
    // getCurrentUser() only verifies the JWT — the user row may have been
    // deleted (e.g. DB reseed) since the cookie was issued. Using a stale sub
    // would violate ProjectRating_userId_fkey (P2003), so confirm the user
    // exists and otherwise fall back to a guest vote.
    const user = payload
      ? await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } })
      : null;

    if (user) {
      // ipHash is intentionally NOT stored on authenticated rows:
      // @@unique([projectId, ipHash]) is the guest dedup key, and writing the
      // (shared) IP here would make a logged-in vote collide (P2002) with any
      // guest vote from the same IP. The deleteMany claims this IP's earlier
      // guest vote — same person voting again after login shouldn't count twice.
      await prisma.$transaction([
        prisma.projectRating.deleteMany({ where: { projectId, ipHash, userId: null } }),
        prisma.projectRating.upsert({
          where: { projectId_userId: { projectId, userId: user.id } },
          create: { projectId, userId: user.id, vote },
          update: { vote },
        }),
      ]);
    } else {
      // Guest: upsert by ipHash
      await prisma.projectRating.upsert({
        where: { projectId_ipHash: { projectId, ipHash } },
        create: { projectId, vote, ipHash },
        update: { vote },
      });
    }
  } catch (err) {
    console.error("[civic rating] vote upsert failed:", err);
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
