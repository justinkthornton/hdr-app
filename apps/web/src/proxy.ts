import { NextResponse, type NextRequest } from "next/server";

function getRequiredApiKey(): string {
  const value = process.env.API_KEY;

  if (!value) {
    throw new Error("API_KEY is required");
  }

  return value;
}

function apiKeysMatch(providedKey: string | null, expectedKey: string): boolean {
  if (!providedKey || providedKey.length !== expectedKey.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < expectedKey.length; index += 1) {
    diff |= providedKey.charCodeAt(index) ^ expectedKey.charCodeAt(index);
  }

  return diff === 0;
}

export function proxy(request: NextRequest): NextResponse {
  const expectedApiKey = getRequiredApiKey();
  const providedApiKey = request.headers.get("x-api-key");

  if (!apiKeysMatch(providedApiKey, expectedApiKey)) {
    return NextResponse.json(
      {
        error: "invalid_api_key"
      },
      {
        status: 401
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/v1/:path*"
};
