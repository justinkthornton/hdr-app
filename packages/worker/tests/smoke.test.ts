import { describe, expect, it } from "vitest";
import { runFakeWorkerSmoke, runPhotomatixWorkerSmoke } from "../src";

describe("worker smoke helpers", () => {
  it("runs the fake worker smoke without PhotomatixCL", async () => {
    const result = await runFakeWorkerSmoke();

    expect(result.status).toBe("passed");
    expect(result.engineResult?.engine).toBe("fake");
    expect(result.engineResult?.success).toBe(true);
    expect(result.engineResult?.commandRedacted).toContain("fake-hdr-engine");
  });

  it("returns a clear blocker when PhotomatixCL is not configured", async () => {
    const result = await runPhotomatixWorkerSmoke({
      LOCAL_STORAGE_ROOT: "/tmp/hdr-storage",
      PHOTOMATIX_LICENSE_KEY: "secret-license-value"
    });

    expect(result.status).toBe("blocked");
    expect(result.message).toContain("PHOTOMATIXCL_PATH is not set");
    expect(result.setupHint).toContain("PHOTOMATIXCL_PATH");
    expect(JSON.stringify(result)).not.toContain("secret-license-value");
  });
});
