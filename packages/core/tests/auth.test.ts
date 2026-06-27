import { describe, expect, it } from "vitest";
import {
  createAdminSessionToken,
  hashApiKey,
  isAdminPasswordValid,
  isApiKeyValid,
  verifyAdminSessionToken,
  verifyApiKeyHash
} from "../src/index";

describe("admin auth helpers", () => {
  it("validates the configured admin password", () => {
    expect(isAdminPasswordValid("secret-admin", "secret-admin")).toBe(true);
    expect(isAdminPasswordValid("wrong", "secret-admin")).toBe(false);
    expect(isAdminPasswordValid("", "secret-admin")).toBe(false);
  });

  it("signs and verifies admin session tokens", () => {
    const now = new Date("2026-06-27T12:00:00Z");
    const token = createAdminSessionToken("secret-admin", now);

    expect(verifyAdminSessionToken(token, "secret-admin", now)).toBe(true);
    expect(verifyAdminSessionToken(`${token}x`, "secret-admin", now)).toBe(false);
    expect(verifyAdminSessionToken(token, "other-secret", now)).toBe(false);
  });
});

describe("api key helpers", () => {
  it("checks env-backed API keys without logging or returning the key", () => {
    expect(isApiKeyValid("local-api-key", "local-api-key")).toBe(true);
    expect(isApiKeyValid("wrong", "local-api-key")).toBe(false);
    expect(isApiKeyValid(null, "local-api-key")).toBe(false);
  });

  it("hashes and verifies stored API key material", () => {
    const hash = hashApiKey("local-api-key");

    expect(hash).not.toContain("local-api-key");
    expect(verifyApiKeyHash("local-api-key", hash)).toBe(true);
    expect(verifyApiKeyHash("wrong", hash)).toBe(false);
  });
});
