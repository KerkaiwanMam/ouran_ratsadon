/**
 * Auth helper wrappers for API routes.
 *
 * Every API handler that needs authentication calls requireAuth() or
 * requireAdmin() at the top. The return type is a discriminated union:
 *
 *   { ok: true;  userId: string; email: string; role: string; name: string }
 *   { ok: false; error: NextResponse }
 *
 * Usage:
 *   const auth = await requireAuth(req);
 *   if (!auth.ok) return auth.error;
 *   // auth.userId is safe to use
 */

import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

const COOKIE_NAME = "auth_token";

type AuthOk = {
  ok: true;
  userId: string;
  email: string;
  role: string;
  name: string;
};

type AuthFail = {
  ok: false;
  error: NextResponse;
};

type AuthResult = AuthOk | AuthFail;

// ─── Extract token from Request or cookies ────────────────────────────────────

function extractToken(req: Request): string | null {
  // 1. Authorization header: "Bearer <token>"
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  // 2. Cookie (set by the Next.js app)
  const cookie = req.headers.get("cookie");
  if (cookie) {
    for (const part of cookie.split(";")) {
      const [name, value] = part.trim().split("=");
      if (name === COOKIE_NAME && value) return decodeURIComponent(value);
    }
  }
  return null;
}

// ─── requireAuth ─────────────────────────────────────────────────────────────

/** Returns { ok: true, userId, email, role } or { ok: false, error: 401 Response }. */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const token = extractToken(req);
  if (!token) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      ),
    };
  }

  const payload = await verifyToken(token);
  if (!payload?.sub) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Token ไม่ถูกต้องหรือหมดอายุ" },
        { status: 401 }
      ),
    };
  }

  // Fetch name from DB (not in JWT to avoid stale data)
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { name: true, banned: true },
  });

  if (!user || user.banned) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "FORBIDDEN", message: "บัญชีนี้ถูกระงับหรือไม่พบ" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    userId: payload.sub,
    email:  payload.email,
    role:   payload.role,
    name:   user.name,
  };
}

// ─── requireAdmin ─────────────────────────────────────────────────────────────

/** Like requireAuth but also requires role === "ADMIN". */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  if (auth.role !== "ADMIN") {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "FORBIDDEN", message: "ต้องการสิทธิ์ Admin" },
        { status: 403 }
      ),
    };
  }

  return auth;
}

// ─── getOptionalAuth ─────────────────────────────────────────────────────────

/** Returns auth payload if logged in, or null for unauthenticated requests.
 *  Never returns an error response — used for routes that work for both
 *  guests and logged-in users (e.g. civic comments). */
export async function getOptionalAuth(
  req: Request
): Promise<{ userId: string; email: string; role: string; name: string } | null> {
  const token = extractToken(req);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { name: true, banned: true },
  });

  if (!user || user.banned) return null;

  return {
    userId: payload.sub,
    email:  payload.email,
    role:   payload.role,
    name:   user.name,
  };
}

// ─── getOptionalAuthFromCookies ───────────────────────────────────────────────

/** Server-Component variant — reads cookies() directly (no Request arg).
 *  Used in Server Components / page.tsx files. */
export async function getOptionalAuthFromCookies(): Promise<{
  userId: string;
  email: string;
  role: string;
  name: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { name: true, banned: true },
  });

  if (!user || user.banned) return null;

  return {
    userId: payload.sub,
    email:  payload.email,
    role:   payload.role,
    name:   user.name,
  };
}
