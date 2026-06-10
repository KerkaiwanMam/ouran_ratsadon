import crypto from "crypto";

/** Generate a cryptographically-random hex token of the given byte length. */
export function generateToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}
