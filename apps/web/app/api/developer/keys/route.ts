import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

const MAX_KEYS_PER_USER = 5;

// Available scopes — expand as the API grows
const VALID_SCOPES = new Set([
  "read:files",
  "read:reports",
  "read:alerts",
  "write:files",
]);

function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const plaintext = `ok_live_${raw}`;
  const prefix = plaintext.slice(0, 16); // "ok_live_" + first 8 chars of hex
  const hash = hashKey(plaintext);
  return { plaintext, prefix, hash };
}

/**
 * GET /api/developer/keys
 * Returns all non-revoked API keys for the current user (no plaintext).
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const keys = await prisma.apiKey.findMany({
    where: { userId: auth.userId, revoked: false },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

/**
 * POST /api/developer/keys
 * Body: { name: string, scopes: string[], expiresAt?: string (ISO) }
 *
 * Returns the plaintext key ONCE — it will never be shown again.
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  // Only Pro/Team plan users can create API keys
  const subscription = await prisma.subscription.findUnique({
    where: { userId: auth.userId },
    select: { plan: true, status: true },
  });

  const allowedPlans = ["PRO", "TEAM"];
  if (!subscription || !allowedPlans.includes(subscription.plan) || subscription.status !== "ACTIVE") {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "API keys ต้องการแผน Pro หรือ Team — อัปเกรดที่ /pricing",
      },
      { status: 403 }
    );
  }

  // Check key count limit
  const count = await prisma.apiKey.count({
    where: { userId: auth.userId, revoked: false },
  });
  if (count >= MAX_KEYS_PER_USER) {
    return NextResponse.json(
      {
        error: "LIMIT_REACHED",
        message: `สร้าง API key ได้สูงสุด ${MAX_KEYS_PER_USER} key ต่อบัญชี — ลบ key เก่าก่อน`,
      },
      { status: 429 }
    );
  }

  const body = await req.json() as {
    name?: string;
    scopes?: string[];
    expiresAt?: string;
  };

  const name = body.name?.trim();
  if (!name || name.length < 1 || name.length > 80) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "กรุณาระบุชื่อ API key (1–80 ตัวอักษร)" },
      { status: 400 }
    );
  }

  const scopes: string[] = (body.scopes ?? ["read:files", "read:reports"]).filter(
    (s) => VALID_SCOPES.has(s)
  );
  if (scopes.length === 0) scopes.push("read:files");

  let expiresAt: Date | undefined;
  if (body.expiresAt) {
    expiresAt = new Date(body.expiresAt);
    if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "expiresAt ต้องเป็นวันในอนาคต" },
        { status: 400 }
      );
    }
  }

  const { plaintext, prefix, hash } = generateApiKey();

  const key = await prisma.apiKey.create({
    data: {
      userId: auth.userId,
      name,
      keyPrefix: prefix,
      keyHash: hash,
      scopes,
      expiresAt: expiresAt ?? null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    key: { ...key, plaintext },
    warning: "เก็บ API key นี้ไว้อย่างปลอดภัย — จะไม่แสดงอีกครั้ง",
  }, { status: 201 });
}
