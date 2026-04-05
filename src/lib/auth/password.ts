import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** SHA256 legacy hash — used only to migrate old accounts on first login */
function legacyHash(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + (process.env.SESSION_SECRET ?? ""))
    .digest("hex");
}

/**
 * Verify a password against a stored hash.
 * Supports both bcrypt hashes (new) and SHA256 hashes (legacy migration).
 * Returns `{ valid, needsRehash }` so the caller can upgrade the stored hash.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  // bcrypt hashes always start with $2b$ or $2a$
  if (storedHash.startsWith("$2")) {
    const valid = await bcrypt.compare(password, storedHash);
    return { valid, needsRehash: false };
  }

  // Legacy SHA256 fallback
  const valid = storedHash === legacyHash(password);
  return { valid, needsRehash: valid }; // if valid, caller should re-hash with bcrypt
}
