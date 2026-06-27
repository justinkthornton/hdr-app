import { describe, expect, it } from "vitest";
import { POST as login } from "../src/app/api/admin/login/route";
import { GET as session } from "../src/app/api/admin/session/route";

describe("admin auth routes", () => {
  it("creates an http-only admin session cookie", async () => {
    process.env.ADMIN_PASSWORD = "secret-admin";

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

  it("reports false for a request without an admin cookie", async () => {
    process.env.ADMIN_PASSWORD = "secret-admin";

    const response = await session(new Request("http://localhost/api/admin/session"));
    const body = (await response.json()) as { authenticated: boolean };

    expect(body.authenticated).toBe(false);
  });
});
