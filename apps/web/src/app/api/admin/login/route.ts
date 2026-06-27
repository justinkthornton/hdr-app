import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getRequiredEnv,
  isAdminPasswordValid
} from "@structure-locked-hdr/core";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const adminPassword = getRequiredEnv("ADMIN_PASSWORD");
  const adminSessionSecret = getRequiredEnv("ADMIN_SESSION_SECRET");

  if (!isAdminPasswordValid(body?.password, adminPassword)) {
    return NextResponse.json(
      {
        error: "invalid_admin_password"
      },
      {
        status: 401
      }
    );
  }

  const response = NextResponse.json({
    authenticated: true
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionToken(adminSessionSecret),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });

  return response;
}
