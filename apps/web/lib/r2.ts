/**
 * Cloudflare R2 client (S3-compatible) — used for direct-to-storage presigned
 * uploads (Phase 3A). Lazy-initialized: if R2_* env vars are not set, `hasR2`
 * is false and callers fall back to local-disk storage in dev, matching the
 * Upstash pattern in middleware.ts.
 */
import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost, type PresignedPost } from "@aws-sdk/s3-presigned-post";

export const hasR2 =
  !!process.env.R2_ENDPOINT &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY &&
  !!process.env.R2_BUCKET_NAME;

let warnedNoR2 = false;
function warnOnce() {
  if (!warnedNoR2) {
    warnedNoR2 = true;
    console.warn(
      "[r2] R2_* env vars not set — falling back to local disk storage (dev only)."
    );
  }
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "";

const r2Client = hasR2
  ? new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

/**
 * Build a presigned POST policy for a direct browser → R2 upload.
 * Enforces `content-length-range` so the client can't bypass the plan's
 * file-size limit by uploading straight to the bucket.
 */
export async function createPresignedUploadPost(opts: {
  key: string;
  contentType: string;
  maxSizeBytes: number;
  expiresInSeconds?: number;
}): Promise<PresignedPost> {
  if (!r2Client) {
    warnOnce();
    throw new Error("R2_NOT_CONFIGURED");
  }
  return createPresignedPost(r2Client, {
    Bucket: R2_BUCKET,
    Key: opts.key,
    Conditions: [
      ["content-length-range", 0, opts.maxSizeBytes],
      ["eq", "$Content-Type", opts.contentType],
    ],
    Fields: {
      "Content-Type": opts.contentType,
    },
    Expires: opts.expiresInSeconds ?? 60 * 5, // 5 minutes
  });
}

/** Fetch an uploaded object's bytes (used by the confirm endpoint to parse it). */
export async function getObjectBytes(key: string): Promise<Buffer> {
  if (!r2Client) {
    warnOnce();
    throw new Error("R2_NOT_CONFIGURED");
  }
  const res = await r2Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  const body = await res.Body?.transformToByteArray();
  if (!body) throw new Error("R2_EMPTY_OBJECT");
  return Buffer.from(body);
}

/**
 * Delete an object immediately — used both by orphan cleanup (UPLOADING >30min
 * with no confirm) and by the confirm endpoint when malware/macros are detected
 * (Phase 3A #4: never let a flagged file sit in the bucket).
 */
export async function deleteObject(key: string): Promise<void> {
  if (!r2Client) {
    warnOnce();
    return;
  }
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}
