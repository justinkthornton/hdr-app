import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
    expect(result.stages?.[0]).toMatchObject({
      name: "binary",
      status: "blocked"
    });
    expect(JSON.stringify(result)).not.toContain("secret-license-value");
  });

  it("reports a blocked executable check without leaking host paths", async () => {
    const result = await runPhotomatixWorkerSmoke(
      {
        HOME: "/Users/example-user",
        LOCAL_STORAGE_ROOT: "/Users/example-user/hdr-storage",
        PHOTOMATIXCL_PATH: "/Users/example-user/local-photomatixcl/PhotomatixCL",
        PHOTOMATIX_LICENSE_KEY: "secret-license-value"
      },
      {
        checkExecutable: async () => false
      }
    );
    const resultJson = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.stages?.[0]).toMatchObject({
      name: "binary",
      status: "blocked"
    });
    expect(resultJson).not.toContain("/Users/example-user");
    expect(resultJson).not.toContain("secret-license-value");
    expect(resultJson).toContain("[PHOTOMATIXCL_PATH]");
  });

  it("skips render when fixtures are absent after binary/startup checks", async () => {
    const result = await runPhotomatixWorkerSmoke(
      {
        LOCAL_STORAGE_ROOT: "/tmp/hdr-storage",
        PHOTOMATIXCL_PATH: "/opt/photomatixcl-local/PhotomatixCL",
        PHOTOMATIX_SMOKE_FIXTURE_DIR: "/tmp/missing-fixtures"
      },
      {
        checkExecutable: async () => true,
        runCommand: async () => ({
          exitCode: 0,
          timedOut: false,
          stdout: "usage",
          stderr: ""
        })
      }
    );

    expect(result.status).toBe("blocked");
    expect(result.fixtureStatus).toBe("absent");
    expect(result.stages?.find((stage) => stage.name === "fixture")).toMatchObject({
      status: "blocked",
      error: "photomatix_fixture_missing"
    });
    expect(result.stages?.some((stage) => stage.name === "render")).toBe(false);
  });

  it("reports a staged render pass with redacted output paths", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "photomatix-smoke-"));
    const fixtureDirectory = path.join(root, "fixtures");
    const outputDirectory = path.join(root, "storage", "phase-2b-photomatix-smoke");

    await mkdir(fixtureDirectory, {
      recursive: true
    });
    await Promise.all([
      writeFile(path.join(fixtureDirectory, "a.jpg"), "a"),
      writeFile(path.join(fixtureDirectory, "b.jpg"), "b"),
      writeFile(path.join(fixtureDirectory, "c.jpg"), "c")
    ]);

    const result = await runPhotomatixWorkerSmoke(
      {
        HOME: root,
        LOCAL_STORAGE_ROOT: path.join(root, "storage"),
        PHOTOMATIXCL_PATH: path.join(root, "local-photomatixcl", "PhotomatixCL"),
        PHOTOMATIX_SMOKE_FIXTURE_DIR: fixtureDirectory,
        PHOTOMATIX_SMOKE_OUTPUT_DIR: outputDirectory
      },
      {
        checkExecutable: async () => true,
        runCommand: async (input) => {
          if (!input.args.includes("-o")) {
            return {
              exitCode: 0,
              timedOut: false,
              stdout: "startup ok",
              stderr: ""
            };
          }

          const outputStem = input.args[input.args.indexOf("-o") + 1]!;
          await mkdir(path.dirname(outputStem), {
            recursive: true
          });
          await writeFile(`${outputStem}.jpg`, "fake photomatix image");
          return {
            exitCode: 0,
            timedOut: false,
            stdout: `wrote ${outputStem}.jpg`,
            stderr: ""
          };
        }
      }
    );
    const resultJson = JSON.stringify(result);

    expect(result.status).toBe("passed");
    expect(result.stages?.map((stage) => stage.name)).toEqual([
      "binary",
      "startup",
      "license",
      "fixture",
      "render"
    ]);
    expect(result.outputPaths?.[0]).toContain("[LOCAL_STORAGE_ROOT]");
    expect(resultJson).not.toContain(root);
  });
});
