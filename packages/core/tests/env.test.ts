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
    expect(env.MAX_UPLOAD_FILES).toBe(30);
    expect(env.MAX_UPLOAD_FILE_BYTES).toBe(104857600);
    expect(env.MAX_UPLOAD_BATCH_BYTES).toBe(524288000);
    expect(env.HDR_ENGINE_MODE).toBe("fake");
    expect(env.PHOTOMATIXCL_PATH).toBe("");
    expect(env.PHOTOMATIX_LICENSE_KEY).toBe("");
  });

  it("accepts explicit upload limit overrides", () => {
    const env = parseRuntimeEnv({
      DATABASE_URL: "postgres://hdr:hdr@localhost:5432/structure_locked_hdr",
      ADMIN_PASSWORD: "secret-admin",
      ADMIN_SESSION_SECRET: "test-session-secret-at-least-32-characters",
      API_KEY: "secret-api-key",
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_ROOT: "/data/storage",
      MAX_UPLOAD_FILES: "7",
      MAX_UPLOAD_FILE_BYTES: "2048",
      MAX_UPLOAD_BATCH_BYTES: "8192",
      HDR_ENGINE_MODE: "photomatix",
      PHOTOMATIXCL_PATH: "/opt/photomatixcl/PhotomatixCL",
      PHOTOMATIX_LICENSE_KEY: ""
    });

    expect(env.MAX_UPLOAD_FILES).toBe(7);
    expect(env.MAX_UPLOAD_FILE_BYTES).toBe(2048);
    expect(env.MAX_UPLOAD_BATCH_BYTES).toBe(8192);
    expect(env.HDR_ENGINE_MODE).toBe("photomatix");
    expect(env.PHOTOMATIXCL_PATH).toBe("/opt/photomatixcl/PhotomatixCL");
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
