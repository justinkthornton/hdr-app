import { createHash, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "sha256";
const DEFAULT_SALT = "structure-locked-hdr-service";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function safeEqualString(left: string, right: string): boolean {
  return timingSafeEqual(sha256(left), sha256(right));
}

export function hashApiKey(apiKey: string, salt = DEFAULT_SALT): string {
  const digest = createHash("sha256").update(`${salt}:${apiKey}`).digest("hex");
  return `${HASH_PREFIX}:${salt}:${digest}`;
}

export function verifyApiKeyHash(apiKey: string, storedHash: string): boolean {
  const [prefix, salt] = storedHash.split(":");

  if (prefix !== HASH_PREFIX || !salt) {
    return false;
  }

  return safeEqualString(hashApiKey(apiKey, salt), storedHash);
}

export function isApiKeyValid(
  providedKey: string | null | undefined,
  expectedKey: string
): boolean {
  if (!providedKey || expectedKey.length === 0) {
    return false;
  }

  return safeEqualString(providedKey, expectedKey);
}
