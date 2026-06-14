import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { verifyTokenFromRequest } from "@/lib/auth";

// Routes that require authentication
// Note: "/compare" is intentionally NOT here — it's the public Civic Layer's
// saved-search comparison page (no login required). The Business Layer's
// "compare 2 SME files" [Pro] page lives at /files/compare and is already
// covered by the "/files" prefix below.
const PROTECTED_PREFIXES = ["/dashboard", "/analytics", "/action-items", "/transactions", "/vendors", "/assistant", "/upload", "/files", "/report", "/alerts", "/settings", "/upgrade"];
const ADMIN_PREFIXES = ["/admin"];

// ─── Edge Rate Limiter (Upstash Redis — distributed) ─────────────────────────
// Runs BEFORE any JWT decode or DB I/O so DDoS/bots are rejected cheaply.
// Vercel Edge runs isolated nodes per region — a local Map would NOT share
// state across nodes and could be bypassed. Upstash Redis (HTTP/REST) gives
// one unified sliding-window counter across every edge node.
//
// Limits (per IP, sliding window 60 s):
//   File upload — 5  req / 60 s  (much more expensive)
//   Auth routes — 10 req / 60 s  (brute-force protection)
//   API routes  — 60 req / 60 s

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

function makeLimiter(tokens: number, prefix: string): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, "60 s"),
    prefix: `ouran:rl:${prefix}`,
    // Hot-cache for keys already known to be blocked — saves Redis round-trips
    // on hammering clients. Source of truth stays in Redis, NOT this Map.
    ephemeralCache: new Map(),
  });
}

// Paths in the Phase 3A presign flow (/api/files/presign, /api/files/[id]/
// local-upload, /api/files/[id]/confirm) must hit the same strict upload tier
// as the legacy direct-upload route — they trigger the same expensive
// storage + parse pipeline. GET /api/files (list) stays on the general tier.
const UPLOAD_PATH_RE = /^\/api\/files\/(upload$|presign$|[^/]+\/(local-upload|confirm)$)/;

// The AI assistant route fans out to an LLM call per request — far costlier
// (latency + $) than a normal DB read, so it gets its own stricter tier ABOVE
// the generic /api/ rule (LIMITERS.find returns the first match, so order =
// priority). The Pro gate in the route already restricts *who* can call it;
// this caps how fast they can. Kept above /api/ but below upload/auth so the
// rate-limiter-first invariant (Step 1) is preserved.
const CHAT_PATH_RE = /^\/api\/business\/chat$/;

const LIMITERS: { matches: (pathname: string) => boolean; limit: number; limiter: Ratelimit | null }[] = [
  { matches: (p) => UPLOAD_PATH_RE.test(p),    limit: 5,  limiter: makeLimiter(5, "upload") },
  { matches: (p) => p.startsWith("/api/auth"), limit: 10, limiter: makeLimiter(10, "auth") },
  { matches: (p) => CHAT_PATH_RE.test(p),      limit: 15, limiter: makeLimiter(15, "chat") },
  { matches: (p) => p.startsWith("/api/"),     limit: 60, limiter: makeLimiter(60, "api") },
];

let warnedMissingUpstash = false;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

type RateResult = { blocked: false } | { blocked: true; limit: number; retryAfterSec: number };

async function checkRateLimit(ip: string, pathname: string): Promise<RateResult> {
  const rule = LIMITERS.find((r) => r.matches(pathname));
  if (!rule) return { blocked: false }; // no rule → pass

  if (!rule.limiter) {
    // Upstash env vars not set (local dev) — skip limiting, warn once.
    if (!warnedMissingUpstash) {
      warnedMissingUpstash = true;
      console.warn(
        "[middleware] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is DISABLED. Required in production."
      );
    }
    return { blocked: false };
  }

  try {
    const { success, reset } = await rule.limiter.limit(ip);
    if (success) return { blocked: false };
    return {
      blocked: true,
      limit: rule.limit,
      retryAfterSec: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (err) {
    // Redis unreachable — fail OPEN (availability over strictness) but log loudly.
    console.error("[middleware] Upstash rate limit check failed, allowing request:", err);
    return { blocked: false };
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Step 1: Rate limit (cheapest check, runs first) ───────────────────────
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(req);
    const result = await checkRateLimit(ip, pathname);
    if (result.blocked) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "คำขอมากเกินไป — กรุณารอสักครู่" },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSec),
            "X-RateLimit-Limit": String(result.limit),
          },
        }
      );
    }
  }

  // ── Step 2: Auth guard (only for protected page routes) ───────────────────
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdmin = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtected && !isAdmin) return NextResponse.next();

  const payload = await verifyTokenFromRequest(req);

  if (!payload) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdmin && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // API routes — REQUIRED for Step 1 rate limiting to run at all.
    // (Without this entry the whole rate limiter is dead code.)
    "/api/:path*",
    "/dashboard/:path*",
    "/analytics/:path*",
    "/action-items/:path*",
    "/transactions/:path*",
    "/vendors/:path*",
    "/assistant/:path*",
    "/upload/:path*",
    "/files/:path*",
    "/report/:path*",
    "/compare/:path*",
    "/alerts/:path*",
    "/settings/:path*",
    "/upgrade/:path*",
    "/admin/:path*",
  ],
};
