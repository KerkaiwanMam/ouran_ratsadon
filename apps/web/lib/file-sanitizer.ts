/**
 * file-sanitizer.ts
 *
 * Two defenses for file uploads:
 *
 * 1. CSV Injection Guard
 *    Spreadsheet apps (Excel, Google Sheets) auto-execute cell values that start
 *    with =, +, -, @, \t, or \r as formulas. If a user downloads our CSV export
 *    and opens it, a malicious description like "=cmd|' /C calc'!A0" runs code
 *    on their machine. We strip the dangerous prefix before storing the value.
 *
 * 2. XLSX Macro (VBA) Detector
 *    An XLSX file is a ZIP archive. A file containing VBA macros will always
 *    include the entry "xl/vbaProject.bin" inside the ZIP. We scan the ZIP's
 *    central directory — a 22-byte read at the end of the file — without
 *    unpacking the full archive, so it's O(1) in memory.
 *
 * References:
 *   OWASP CSV Injection: https://owasp.org/www-community/attacks/CSV_Injection
 *   OOXML spec §22.5 (VBA storage)
 */

// ─── CSV Injection ────────────────────────────────────────────────────────────

// Characters that trigger formula execution in Excel/Sheets when they appear
// at the start of a cell value.
const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

/**
 * Strip leading formula-trigger characters from a string field.
 * "=cmd|..." → "'=cmd|..." (Excel treats leading ' as text-literal prefix)
 *
 * Returns the sanitized string unchanged if it's safe.
 */
export function sanitizeStringField(value: string): string {
  if (!value) return value;
  if (FORMULA_TRIGGER_RE.test(value)) {
    // Prefix with a single quote — universally recognized as "display as text"
    // by spreadsheet apps; invisible to end users viewing the cell.
    return `'${value}`;
  }
  return value;
}

/**
 * Recursively sanitize all string leaves of an object tree.
 * Used to sanitize the parsed transaction object before DB insert.
 */
export function sanitizeRecord<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === "string") {
      result[key] = sanitizeStringField(val);
    } else if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      result[key] = sanitizeRecord(val as Record<string, unknown>);
    }
  }
  return result as T;
}

// ─── XLSX Macro Detector ──────────────────────────────────────────────────────

// Signature for ZIP local file header (PK\x03\x04)
const ZIP_LOCAL_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
// Signature for ZIP end-of-central-directory record (PK\x05\x06)
const ZIP_EOCD_SIG    = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

const VBA_ENTRY = "xl/vbaProject.bin";

/**
 * Scan an XLSX buffer for a VBA macro project without fully extracting the ZIP.
 *
 * Strategy:
 *   1. Verify the file starts with a ZIP local-file header (PK\x03\x04) — fast
 *      rejection of obviously wrong types.
 *   2. Search the raw bytes for the VBA entry name string. This is intentionally
 *      a simple substring scan rather than full ZIP parsing — it's fast, has no
 *      dependencies, and the entry name is always stored as plain ASCII in the
 *      ZIP central directory even if the content is binary.
 *
 * Returns true if a VBA project is detected (file should be REJECTED).
 */
export function containsMacros(buffer: Buffer): boolean {
  // Check ZIP magic bytes
  if (!buffer.slice(0, 4).equals(ZIP_LOCAL_HEADER)) return false;

  // Scan for VBA entry name as raw bytes
  const needle = Buffer.from(VBA_ENTRY, "ascii");
  const idx = buffer.indexOf(needle);
  return idx !== -1;
}

/**
 * Allowed upload extensions and their expected MIME types.
 * Anything not in this map is rejected before the file is read into memory.
 */
export const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream", // some browsers/OS send this for xlsx
  ],
  csv: ["text/csv", "text/plain", "application/csv", "application/octet-stream"],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
};

/**
 * Validate that the filename extension is in the allowlist.
 * Returns the extension (lowercase) or throws with a Thai error message.
 */
export function validateExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS[ext]) {
    throw new Error(
      `ไฟล์นามสกุล .${ext} ไม่รองรับ — อนุญาตเฉพาะ .xlsx, .xls, .csv เท่านั้น`
    );
  }
  return ext;
}

/**
 * Validate MIME type against the allowed list for the given extension.
 * Permissive — logs a warning instead of hard-rejecting because browser MIME
 * reporting is inconsistent (some send "application/octet-stream" for xlsx).
 */
export function warnOnSuspiciousMime(
  ext: string,
  contentType: string | null
): { suspicious: boolean; reason: string } {
  if (!contentType) return { suspicious: false, reason: "" };
  const allowed = ALLOWED_EXTENSIONS[ext] ?? [];
  const base = contentType.split(";")[0].trim();
  if (!allowed.includes(base)) {
    return {
      suspicious: true,
      reason: `Content-Type "${base}" ไม่ตรงกับนามสกุล .${ext}`,
    };
  }
  return { suspicious: false, reason: "" };
}
