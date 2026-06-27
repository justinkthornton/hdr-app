import {
  ADMIN_SESSION_COOKIE,
  getRequiredEnv,
  verifyAdminSessionToken
} from "@structure-locked-hdr/core";
import { getCookieValue, jsonResponse } from "./http";

export function isAdminRequest(request: Request): boolean {
  const token = getCookieValue(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);
  return verifyAdminSessionToken(token, getRequiredEnv("ADMIN_SESSION_SECRET"));
}

export function requireAdminRequest(request: Request): Response | null {
  if (isAdminRequest(request)) {
    return null;
  }

  return jsonResponse(
    {
      error: "admin_session_required"
    },
    {
      status: 401
    }
  );
}
