/**
 * Storage abstraction over the two upload targets used by the presign flow:
 * Cloudflare R2 (production) or local disk under uploads/ (dev fallback when
 * R2_* env vars are not set). Both branches are keyed by File.storageKey.
 */
import { readFile, unlink } from "fs/promises";
import path from "path";
import { hasR2, getObjectBytes, deleteObject } from "@/lib/r2";

const uploadsDir = path.join(process.cwd(), "uploads");

export async function getStoredObjectBytes(storageKey: string): Promise<Buffer> {
  if (hasR2) return getObjectBytes(storageKey);
  return readFile(path.join(uploadsDir, storageKey));
}

export async function deleteStoredObject(storageKey: string): Promise<void> {
  if (hasR2) {
    await deleteObject(storageKey);
    return;
  }
  try {
    await unlink(path.join(uploadsDir, storageKey));
  } catch (err) {
    // Already gone or never written — not fatal for cleanup paths.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
