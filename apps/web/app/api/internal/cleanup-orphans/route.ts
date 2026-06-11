/**
 * GET /api/internal/cleanup-orphans
 *
 * Called by a cron job every 30 minutes.
 * Protected by CRON_SECRET header so external callers cannot trigger it.
 *
 * Vercel cron config (vercel.json):
 * {
 *   "crons": [{ "path": "/api/internal/cleanup-orphans", "schedule": "*\/30 * * * *" }]
 *   (the backslash is only to keep this comment block valid — omit it in vercel.json)
 * }
 *
 * Add CRON_SECRET to .env.local / Vercel environment variables.
 */

import { NextRequest, NextResponse } from "next/server";
import { cleanupOrphanFiles } from "@/lib/orphan-cleaner";

export async function GET(req: NextRequest) {
  // Verify cron secret — rejects all requests that don't carry the shared secret.
  // Vercel Cron sends it as "Authorization: Bearer <CRON_SECRET>"; the
  // x-cron-secret header is kept for local dev / manual triggers:
  //   curl -H "x-cron-secret: <value>" localhost:3000/api/internal/cleanup-orphans
  const headerSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    // CRON_SECRET not configured — allow only in dev (NODE_ENV !== production)
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
  } else if (headerSecret !== expected && bearerSecret !== expected) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const result = await cleanupOrphanFiles();

  return NextResponse.json({
    ok: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
