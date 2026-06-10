import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalAuth } from "@/lib/auth-helpers";

const RATE_LIMIT_WINDOW_MS = 60_000;   // 1 minute
const RATE_LIMIT_MAX      = 3;          // max 3 comments per minute per IP
const MAX_BODY_LENGTH     = 1_000;

// Simple in-memory rate-limiter (keyed by IP hash). Good enough for portfolio scale.
const rateLimiter = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimiter.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

// Basic profanity/spam filter (simple blocklist — extend as needed)
const BLOCKED_PATTERNS = [/https?:\/\//i, /spam/i];

function isSuspicious(text: string): boolean {
  return BLOCKED_PATTERNS.some((p) => p.test(text));
}

// ─── GET /api/civic/comments?projectId=X&page=1 ──────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const page      = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit     = 20;

  if (!projectId) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "projectId จำเป็น" }, { status: 400 });
  }

  const [total, comments] = await Promise.all([
    prisma.projectComment.count({ where: { projectId, status: "VISIBLE" } }),
    prisma.projectComment.findMany({
      where: { projectId, status: "VISIBLE" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    limit,
    hasMore: page * limit < total,
    comments: comments.map((c) => ({
      id:          c.id,
      body:        c.body,
      createdAt:   c.createdAt,
      authorName:  c.user?.name ?? c.guestName ?? "ไม่ระบุชื่อ",
      authorAvatar: c.user?.avatarUrl ?? null,
      isGuest:     !c.userId,
    })),
  });
}

// ─── POST /api/civic/comments ─────────────────────────────────────────────────

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "RATE_LIMIT", message: "ส่งความคิดเห็นบ่อยเกินไป — กรุณารอสักครู่" },
      { status: 429 }
    );
  }

  const auth = await getOptionalAuth(req);
  const body = await req.json() as { projectId?: string; body?: string; guestName?: string };

  const { projectId, body: text, guestName } = body;

  if (!projectId?.trim()) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "projectId จำเป็น" }, { status: 400 });
  }

  if (!text?.trim() || text.trim().length < 5) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "ความคิดเห็นต้องมีอย่างน้อย 5 ตัวอักษร" },
      { status: 400 }
    );
  }

  if (text.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: `ความคิดเห็นยาวเกินไป (สูงสุด ${MAX_BODY_LENGTH} ตัวอักษร)` },
      { status: 400 }
    );
  }

  // Guests must provide a name
  if (!auth && !guestName?.trim()) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "กรุณาระบุชื่อ" },
      { status: 400 }
    );
  }

  // Determine moderation status — auto-approve logged-in users, hold guests for review
  const suspicious = isSuspicious(text);
  const status = auth && !suspicious ? "VISIBLE" : "PENDING_REVIEW";

  const comment = await prisma.projectComment.create({
    data: {
      projectId: projectId.trim(),
      userId:    auth?.userId ?? null,
      guestName: auth ? null : (guestName?.trim() ?? null),
      body:      text.trim(),
      status,
    },
  });

  return NextResponse.json(
    {
      comment: {
        id:        comment.id,
        status:    comment.status,
        message:
          status === "PENDING_REVIEW"
            ? "ความคิดเห็นของคุณอยู่ระหว่างการตรวจสอบ และจะแสดงเมื่อได้รับการอนุมัติ"
            : "ความคิดเห็นถูกเผยแพร่แล้ว",
      },
    },
    { status: 201 }
  );
}
