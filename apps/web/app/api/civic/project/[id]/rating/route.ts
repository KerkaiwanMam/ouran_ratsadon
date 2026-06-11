import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { requireAuth } from "@/lib/auth-helpers";
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
// Requires login — one vote per project per user. (Guest voting by IP was
// removed; legacy guest rows are claimed on the voter's first logged-in vote.)
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

  // Voting requires an account — guests get 401 and the RatingWidget shows
  // the login popup. requireAuth also confirms the user row still exists, so
  // a stale JWT can't trip ProjectRating_userId_fkey (P2003).
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const ipHash = hashIp(getClientIp(req));

  try {
    // ipHash is intentionally NOT stored on authenticated rows:
    // @@unique([projectId, ipHash]) was the guest-era dedup key, and writing
    // the (shared) IP here would make a logged-in vote collide (P2002) with a
    // legacy guest row from the same IP. The deleteMany claims this IP's old
    // guest vote — same person voting again after login shouldn't count twice.
    await prisma.$transaction([
      prisma.projectRating.deleteMany({ where: { projectId, ipHash, userId: null } }),
      prisma.projectRating.upsert({
        where: { projectId_userId: { projectId, userId: auth.userId } },
        create: { projectId, userId: auth.userId, vote },
        update: { vote },
      }),
    ]);
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
