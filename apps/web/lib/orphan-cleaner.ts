/**
 * orphan-cleaner.ts
 *
 * Detects and resolves two categories of abandoned file records:
 *
 * 1. PROCESSING orphans
 *    A file that stays in PROCESSING longer than PROCESSING_TTL_MS means the
 *    parser crashed, the server restarted mid-parse, or the job was lost. These
 *    records will never self-heal — mark them ERROR so the user can retry.
 *
 * 2. UPLOADING orphans
 *    A file in UPLOADING means the presigned URL was issued but the client never
 *    confirmed the upload (network drop, browser close). The object may or may
 *    not exist in storage (Firebase or local-disk dev fallback) — delete it
 *    before marking the row ERROR so we don't leave orphaned objects behind.
 *
 * Called from:
 *   GET /api/internal/cleanup-orphans  (protected by CRON_SECRET header)
 *
 * Recommended cron schedule: every 30 minutes
 *   Vercel Cron: "*\/30 * * * *"  (omit the backslash in vercel.json — it only keeps this comment valid)
 */

import { prisma } from "@/lib/db";
import { deleteStoredObject } from "@/lib/file-storage";

const PROCESSING_TTL_MS = 60 * 60 * 1000;  // 1 hour
const UPLOADING_TTL_MS  = 30 * 60 * 1000;  // 30 minutes

export interface CleanupResult {
  processingFixed: number;
  uploadingFixed:  number;
  errors:          string[];
}

export async function cleanupOrphanFiles(): Promise<CleanupResult> {
  const now = new Date();
  const errors: string[] = [];

  // ── 1. PROCESSING orphans ─────────────────────────────────────────────────
  const processingCutoff = new Date(now.getTime() - PROCESSING_TTL_MS);
  let processingFixed = 0;

  try {
    const result = await prisma.file.updateMany({
      where: {
        status:     "PROCESSING",
        uploadedAt: { lt: processingCutoff },
      },
      data: {
        status:       "ERROR",
        errorMessage: "การประมวลผลใช้เวลานานเกินไป — กรุณาอัปโหลดไฟล์ใหม่อีกครั้ง",
      },
    });
    processingFixed = result.count;
    if (processingFixed > 0) {
      console.log(`[orphan-cleaner] Fixed ${processingFixed} PROCESSING orphan(s)`);
    }
  } catch (err) {
    const msg = `Failed to fix PROCESSING orphans: ${String(err)}`;
    console.error(`[orphan-cleaner] ${msg}`);
    errors.push(msg);
  }

  // ── 2. UPLOADING orphans (pre-wired for Firebase signed URL flow) ────────
  const uploadingCutoff = new Date(now.getTime() - UPLOADING_TTL_MS);
  let uploadingFixed = 0;

  try {
    const stale = await prisma.file.findMany({
      where: {
        status:     "UPLOADING",
        uploadedAt: { lt: uploadingCutoff },
      },
      select: { id: true, storageKey: true },
    });

    if (stale.length > 0) {
      // Delete the (possibly partial) object from storage before marking the
      // row ERROR — best-effort, a missing object is not an error here.
      await Promise.all(
        stale.map(async (f) => {
          try {
            if (f.storageKey) await deleteStoredObject(f.storageKey);
          } catch (err) {
            errors.push(`Failed to delete storage object for file ${f.id}: ${String(err)}`);
          }
        })
      );

      const ids = stale.map((f) => f.id);
      const result = await prisma.file.updateMany({
        where: { id: { in: ids } },
        data: {
          status:       "ERROR",
          errorMessage: "หมดเวลาอัปโหลด — กรุณาอัปโหลดไฟล์ใหม่อีกครั้ง",
        },
      });
      uploadingFixed = result.count;
      if (uploadingFixed > 0) {
        console.log(`[orphan-cleaner] Fixed ${uploadingFixed} UPLOADING orphan(s)`);
      }
    }
  } catch (err) {
    const msg = `Failed to fix UPLOADING orphans: ${String(err)}`;
    console.error(`[orphan-cleaner] ${msg}`);
    errors.push(msg);
  }

  return { processingFixed, uploadingFixed, errors };
}
