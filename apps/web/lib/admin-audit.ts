/**
 * Admin audit logging + rate limiting for civic data operations.
 *
 * Audit log: every upload, delete, and notes-edit writes an AdminLog row so
 * there is an immutable record of who did what and when.
 *
 * Rate limiting: simple in-process token-bucket — 5 uploads per admin per
 * rolling hour. Adequate for the admin-only upload path (one or two people).
 * If we ever move to a multi-instance deploy, replace with a Redis counter.
 */

import crypto from "crypto";
import { Prisma, AdminAction } from "@prisma/client";
import { prisma } from "@/lib/db";

// Re-export so callers can import AdminAction from this module
export type { AdminAction };

export async function writeAdminLog(opts: {
  adminId: string;
  action: AdminAction;
  targetId?: string;
  detail?: Prisma.InputJsonValue;
  ip?: string;
}): Promise<void> {
  try {
    await prisma.adminLog.create({
      data: {
        adminId: opts.adminId,
        action: opts.action,
        targetId: opts.targetId ?? null,
        // Json (@db.JsonB) — store as plain object; Prisma requires DbNull (not
        // a bare null) to write SQL NULL into a nullable Json column.
        detail: opts.detail ?? Prisma.DbNull,
        ipHash: opts.ip ? hashIp(opts.ip) : null,
      },
    });
  } catch (err) {
    // Logging must never block the main operation
    console.error("[admin-audit] Failed to write AdminLog:", err);
  }
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

const UPLOAD_LIMIT = 5;        // max uploads per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface Bucket {
  count: number;
  windowStart: number;
}

// Module-level store — survives across requests in the same process.
const uploadBuckets = new Map<string, Bucket>();

/**
 * Check and record an upload attempt for `adminId`.
 * Returns `{ allowed: true }` if under the limit or `{ allowed: false, retryAfterMs }`.
 */
export function checkUploadRateLimit(adminId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  let bucket = uploadBuckets.get(adminId);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
  }

  if (bucket.count >= UPLOAD_LIMIT) {
    const retryAfterMs = WINDOW_MS - (now - bucket.windowStart);
    return { allowed: false, retryAfterMs };
  }

  bucket.count++;
  uploadBuckets.set(adminId, bucket);
  return { allowed: true };
}

// ─── Magic-bytes content validation ──────────────────────────────────────────

/**
 * Validate that file bytes actually match the declared extension.
 * Returns an error string if invalid, or null if OK.
 */
export function validateFileMagicBytes(bytes: Uint8Array, ext: string): string | null {
  if (bytes.length < 8) return "ไฟล์มีขนาดเล็กเกินไป";

  switch (ext) {
    case "xlsx":
    case "xls": {
      // XLSX is a ZIP (PK\x03\x04). XLS is OLE2 (\xD0\xCF\x11\xE0).
      const isXlsx = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
      const isXls  = bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0;
      if (!isXlsx && !isXls) {
        return "ไฟล์ไม่ใช่ Excel จริง (.xlsx/.xls) — magic bytes ไม่ตรง";
      }
      return null;
    }
    case "csv": {
      // CSV must be printable text (ASCII/UTF-8). Check first 512 bytes.
      const sample = bytes.slice(0, 512);
      const hasBinary = Array.from(sample).some(
        (b) => b < 0x09 || (b > 0x0d && b < 0x20 && b !== 0x1b)
      );
      if (hasBinary) return "ไฟล์ CSV มีไบต์ที่ไม่ใช่ข้อความ — อาจเป็นไฟล์ไบนารี";
      return null;
    }
    case "html":
    case "htm": {
      // HTML starts with a BOM, a doctype, or an angle bracket
      const head = String.fromCharCode(...Array.from(bytes.slice(0, 100)))
        .trimStart()
        .toLowerCase();
      const ok = head.startsWith("<!") || head.startsWith("<html") || head.startsWith("﻿<");
      if (!ok) return "ไฟล์ไม่ใช่ HTML จริง — ไม่พบ <!DOCTYPE หรือ <html> ที่ต้นไฟล์";
      return null;
    }
    default:
      return null; // unknown ext — already validated by ALLOWED_EXTS set
  }
}
