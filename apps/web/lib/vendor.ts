/**
 * Normalizes a transaction description into a vendor grouping key — strips
 * digits (dates, invoice/ref numbers) and collapses whitespace so the same
 * supplier groups together across months despite varying reference numbers.
 */
export function normalizeVendorName(description: string): string {
  const stripped = description.replace(/[0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return stripped.length >= 3 ? stripped.toLowerCase() : description.trim().toLowerCase();
}
