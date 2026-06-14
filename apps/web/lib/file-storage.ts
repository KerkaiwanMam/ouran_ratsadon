/**
 * Storage abstraction over the two upload targets used by the presign flow:
 * Firebase Storage (production) or local disk under uploads/ (dev fallback
 * when FIREBASE_* env vars are not set). Both branches are keyed by
 * File.storageKey.
 */
import { readFile, unlink } from "fs/promises";
import path from "path";
import { hasFirebase, getObjectBytes, deleteObject } from "@/lib/firebase-storage";

const uploadsDir = path.join(process.cwd(), "uploads");

/**
 * Resolve a storageKey to an absolute path under uploads/, rejecting any key
 * that escapes it. Keys are server-generated so this should never fire, but
 * every filesystem touch keyed by DB data goes through this containment check.
 */
export function resolveLocalStoragePath(storageKey: string): string {
  const resolved = path.resolve(uploadsDir, storageKey);
  if (resolved !== uploadsDir && !resolved.startsWith(uploadsDir + path.sep)) {
    throw new Error(`INVALID_STORAGE_KEY: ${storageKey}`);
  }
  return resolved;
}

export async function getStoredObjectBytes(storageKey: string): Promise<Buffer> {
  if (hasFirebase) return getObjectBytes(storageKey);
  return readFile(resolveLocalStoragePath(storageKey));
}

export async function deleteStoredObject(storageKey: string): Promise<void> {
  if (hasFirebase) {
    await deleteObject(storageKey);
    return;
  }
  try {
    await unlink(resolveLocalStoragePath(storageKey));
  } catch (err) {
    // Already gone or never written — not fatal for cleanup paths.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
