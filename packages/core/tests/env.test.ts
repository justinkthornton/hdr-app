import { describe, expect, it } from "vitest";
import { parseRuntimeEnv } from "../src/index";

describe("runtime env validation", () => {
  it("accepts the Phase 1 env contract", () => {
    const env = parseRuntimeEnv({
      DATABASE_URL: "postgres://hdr:hdr@localhost:5432/structure_locked_hdr",
      ADMIN_PASSWORD: "secret-admin",
      ADMIN_SESSION_SECRET: "test-session-secret-at-least-32-characters",
      API_KEY: "secret-api-key",
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_ROOT: "/data/storage",
      PHOTOMATIX_LICENSE_KEY: ""
    });

    expect(env.STORAGE_DRIVER).toBe("local");
    expect(env.PHOTOMATIX_LICENSE_KEY).toBe("");
  });

  it("rejects missing admin and API credentials", () => {
    expect(() =>
      parseRuntimeEnv({
        DATABASE_URL: "postgres://hdr:hdr@localhost:5432/structure_locked_hdr",
        ADMIN_SESSION_SECRET: "test-session-secret-at-least-32-characters",
        STORAGE_DRIVER: "local",
        LOCAL_STORAGE_ROOT: "/data/storage"
      })
    ).toThrow();
  });
});
