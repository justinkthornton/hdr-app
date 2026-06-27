import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
import { GET as getHealth } from "../src/app/api/v1/health/route";

function makeRequest(apiKey?: string): NextRequest {
  return makeRequestForPath("/api/v1/health", apiKey);
}

function makeRequestForPath(path: string, apiKey?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: apiKey
      ? {
          "x-api-key": apiKey
        }
      : undefined
  });
}

describe("/api/v1 health auth", () => {
  it("allows a valid x-api-key through middleware and returns health", async () => {
    process.env.API_KEY = "valid-test-api-key";

    const gate = proxy(makeRequest("valid-test-api-key"));
    const response = await getHealth();
    const body = (await response.json()) as { ok: boolean; pipelineEnabled: boolean };

    expect(gate.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.pipelineEnabled).toBe(false);
  });

  it("rejects a missing x-api-key", async () => {
    process.env.API_KEY = "valid-test-api-key";

    expect(proxy(makeRequest()).status).toBe(401);
  });

  it("rejects an invalid x-api-key", async () => {
    process.env.API_KEY = "valid-test-api-key";

    expect(proxy(makeRequest("wrong")).status).toBe(401);
  });

  it("protects Phase 2A bracket group API routes through the same proxy", () => {
    process.env.API_KEY = "valid-test-api-key";

    expect(
      proxy(makeRequestForPath("/api/v1/shoots/shoot-1/bracket-groups", "valid-test-api-key"))
        .status
    ).toBe(200);
    expect(proxy(makeRequestForPath("/api/v1/shoots/shoot-1/bracket-groups")).status).toBe(401);
    expect(
      proxy(makeRequestForPath("/api/v1/bracket-groups/group-1/approve", "wrong")).status
    ).toBe(401);
  });
});
