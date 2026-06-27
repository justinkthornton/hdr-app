import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
import { GET as getHealth } from "../src/app/api/v1/health/route";

function makeRequest(apiKey?: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/health", {
    headers: apiKey
      ? {
          "x-api-key": apiKey
        }
      : undefined
  });
}

describe("/api/v1 health auth", () => {
  it("allows a valid x-api-key through middleware and returns health", async () => {
    process.env.API_KEY = "local-api-key";

    const gate = proxy(makeRequest("local-api-key"));
    const response = await getHealth();
    const body = (await response.json()) as { ok: boolean; pipelineEnabled: boolean };

    expect(gate.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.pipelineEnabled).toBe(false);
  });

  it("rejects missing or invalid x-api-key values", async () => {
    process.env.API_KEY = "local-api-key";

    expect(proxy(makeRequest()).status).toBe(401);
    expect(proxy(makeRequest("wrong")).status).toBe(401);
  });
});
