import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "slhdr_admin_session";
const SESSION_VERSION = 1;
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminSessionPayload = {
  exp: number;
  iat: number;
  v: typeof SESSION_VERSION;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminPasswordValid(
  submittedPassword: string | null | undefined,
  expectedPassword: string
): boolean {
  if (!submittedPassword || expectedPassword.length === 0) {
    return false;
  }

  const submittedSignature = signPayload("admin-password", submittedPassword);
  const expectedSignature = signPayload("admin-password", expectedPassword);
  return safeEqual(submittedSignature, expectedSignature);
}

export function createAdminSessionToken(secret: string, now = new Date()): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload: AdminSessionPayload = {
    exp: issuedAt + SESSION_TTL_SECONDS,
    iat: issuedAt,
    v: SESSION_VERSION
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(
  token: string | null | undefined,
  secret: string,
  now = new Date()
): boolean {
  if (!token || secret.length === 0) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<AdminSessionPayload>;
    const currentTime = Math.floor(now.getTime() / 1000);
    return (
      payload.v === SESSION_VERSION && typeof payload.exp === "number" && payload.exp > currentTime
    );
  } catch {
    return false;
  }
}
