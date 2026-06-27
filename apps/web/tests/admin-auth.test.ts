import { describe, expect, it } from "vitest";
import { POST as login } from "../src/app/api/admin/login/route";
import { GET as session } from "../src/app/api/admin/session/route";

describe("admin auth routes", () => {
  it("creates an http-only admin session cookie", async () => {
    process.env.ADMIN_PASSWORD = "secret-admin";
    process.env.ADMIN_SESSION_SECRET = "test-session-secret-at-least-32-characters";

    const response = await login(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          password: "secret-admin"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("slhdr_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("uses ADMIN_SESSION_SECRET rather than ADMIN_PASSWORD to verify sessions", async () => {
    process.env.ADMIN_PASSWORD = "secret-admin";
    process.env.ADMIN_SESSION_SECRET = "test-session-secret-at-least-32-characters";

    const loginResponse = await login(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          password: "secret-admin"
        })
      })
    );
    const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0];

    process.env.ADMIN_PASSWORD = "rotated-admin-password";

    const response = await session(
      new Request("http://localhost/api/admin/session", {
        headers: cookie
          ? {
              cookie
            }
          : undefined
      })
    );
    const body = (await response.json()) as { authenticated: boolean };

    expect(body.authenticated).toBe(true);
  });

  it("reports false for a request without an admin cookie", async () => {
    process.env.ADMIN_PASSWORD = "secret-admin";
    process.env.ADMIN_SESSION_SECRET = "test-session-secret-at-least-32-characters";

    const response = await session(new Request("http://localhost/api/admin/session"));
    const body = (await response.json()) as { authenticated: boolean };

    expect(body.authenticated).toBe(false);
  });
});
