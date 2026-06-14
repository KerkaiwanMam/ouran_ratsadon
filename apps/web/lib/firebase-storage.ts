/**
 * Firebase Storage client — used for direct-to-storage signed uploads
 * (Phase 3A). Lazy-initialized: if FIREBASE_* env vars are not set,
 * `hasFirebase` is false and callers fall back to local-disk storage in dev,
 * matching the Upstash pattern in middleware.ts.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

export const hasFirebase =
  !!process.env.FIREBASE_PROJECT_ID &&
  !!process.env.FIREBASE_CLIENT_EMAIL &&
  !!process.env.FIREBASE_PRIVATE_KEY &&
  !!process.env.FIREBASE_STORAGE_BUCKET;

let warnedNoFirebase = false;
function warnOnce() {
  if (!warnedNoFirebase) {
    warnedNoFirebase = true;
    console.warn(
      "[firebase-storage] FIREBASE_* env vars not set — falling back to local disk storage (dev only)."
    );
  }
}

function getBucket() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
  return getStorage().bucket();
}

/**
 * Build a v4 signed PUT URL for a direct browser → Firebase Storage upload.
 * Unlike R2's presigned POST, this is a single URL — the client PUTs the raw
 * body with a matching Content-Type header, no policy conditions / size cap
 * enforcement at the storage layer (see confirm/route.ts for the mitigation).
 */
export async function createSignedUploadUrl(opts: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ url: string; contentType: string }> {
  if (!hasFirebase) {
    warnOnce();
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }
  const [url] = await getBucket()
    .file(opts.key)
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + (opts.expiresInSeconds ?? 60 * 5) * 1000,
      contentType: opts.contentType,
    });
  return { url, contentType: opts.contentType };
}

/** Fetch an uploaded object's bytes (used by the confirm endpoint to parse it). */
export async function getObjectBytes(key: string): Promise<Buffer> {
  if (!hasFirebase) {
    warnOnce();
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }
  const [buf] = await getBucket().file(key).download();
  return buf;
}

/**
 * Delete an object immediately — used both by orphan cleanup (UPLOADING >30min
 * with no confirm) and by the confirm endpoint when malware/macros are detected
 * (Phase 3A #4: never let a flagged file sit in the bucket).
 */
export async function deleteObject(key: string): Promise<void> {
  if (!hasFirebase) {
    warnOnce();
    return;
  }
  await getBucket().file(key).delete({ ignoreNotFound: true });
}
