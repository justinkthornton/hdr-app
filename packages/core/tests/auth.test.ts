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
    const token = createAdminSessionToken("session-secret", now);

    expect(verifyAdminSessionToken(token, "session-secret", now)).toBe(true);
    expect(verifyAdminSessionToken(`${token}x`, "session-secret", now)).toBe(false);
    expect(verifyAdminSessionToken(token, "other-secret", now)).toBe(false);
  });
});

describe("api key helpers", () => {
  it("checks env-backed API keys without logging or returning the key", () => {
    expect(isApiKeyValid("valid-test-api-key", "valid-test-api-key")).toBe(true);
    expect(isApiKeyValid("wrong", "valid-test-api-key")).toBe(false);
    expect(isApiKeyValid(null, "valid-test-api-key")).toBe(false);
  });

  it("hashes and verifies stored API key material", () => {
    const hash = hashApiKey("valid-test-api-key");

    expect(hash).not.toContain("valid-test-api-key");
    expect(verifyApiKeyHash("valid-test-api-key", hash)).toBe(true);
    expect(verifyApiKeyHash("wrong", hash)).toBe(false);
  });
});
