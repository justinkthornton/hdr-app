import { describe, expect, it } from "vitest";
import {
  buildRedactedCommand,
  FakeHdrEngine,
  PhotomatixCliEngine,
  redactSecrets,
  type CommandInvocation
} from "../src/hdr/engine";

describe("HDR engine seam", () => {
  it("returns a deterministic fake HDR render result", async () => {
    const engine = new FakeHdrEngine();
    const result = await engine.render({
      inputFilePaths: ["/fixtures/a.jpg", "/fixtures/b.jpg", "/fixtures/c.jpg"],
      outputDirectory: "/tmp/hdr-output",
      outputBaseName: "group-1",
      preset: "Natural",
      outputFormat: "jpg"
    });

    expect(result).toMatchObject({
      engine: "fake",
      success: true,
      exitCode: 0,
      timedOut: false,
      error: null,
      outputPaths: ["/tmp/hdr-output/group-1.jpg"]
    });
    expect(result.commandRedacted).toContain("fake-hdr-engine");
    expect(result.metadata.inputCount).toBe(3);
  });

  it("adds trial mode to PhotomatixCL render commands when no license is configured", async () => {
    const invocations: CommandInvocation[] = [];
    const engine = new PhotomatixCliEngine({
      executablePath: "/opt/photomatixcl/PhotomatixCL",
      checkExecutable: async () => true,
      runCommand: async (input) => {
        invocations.push(input);
        return {
          exitCode: 0,
          timedOut: false,
          stdout: "rendered",
          stderr: ""
        };
      }
    });

    const result = await engine.render({
      inputFilePaths: ["/in/0ev.jpg", "/in/plus2.jpg", "/in/minus2.jpg"],
      outputDirectory: "/out",
      outputBaseName: "bracket",
      preset: "Painterly",
      outputFormat: "tif",
      timeoutMs: 12_000
    });

    expect(result.success).toBe(true);
    expect(result.outputPaths).toEqual(["/out/bracket.tif"]);
    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toMatchObject({
      executablePath: "/opt/photomatixcl/PhotomatixCL",
      timeoutMs: 12_000,
      args: [
        "-trial",
        "-a2",
        "-x",
        "Painterly",
        "-h",
        "remove",
        "-s",
        "tif",
        "-o",
        "/out/bracket",
        "/in/0ev.jpg",
        "/in/plus2.jpg",
        "/in/minus2.jpg"
      ]
    });
    expect(result.metadata.trialMode).toBe(true);
    expect(result.commandRedacted).toBe(
      "/opt/photomatixcl/PhotomatixCL -trial -a2 -x Painterly -h remove -s tif -o /out/bracket /in/0ev.jpg /in/plus2.jpg /in/minus2.jpg"
    );
  });

  it("does not add trial mode to licensed PhotomatixCL render commands", async () => {
    const licenseKey = "secret-license-value";
    const invocations: CommandInvocation[] = [];
    const engine = new PhotomatixCliEngine({
      executablePath: "/opt/photomatixcl/PhotomatixCL",
      licenseKey,
      checkExecutable: async () => true,
      runCommand: async (input) => {
        invocations.push(input);
        return {
          exitCode: 0,
          timedOut: false,
          stdout: "ok",
          stderr: ""
        };
      }
    });

    const result = await engine.render({
      inputFilePaths: ["/in/0ev.jpg", "/in/plus2.jpg", "/in/minus2.jpg"],
      outputDirectory: "/out",
      outputBaseName: "licensed-bracket",
      preset: "Natural",
      outputFormat: "jpg",
      timeoutMs: 12_000
    });

    expect(result.success).toBe(true);
    expect(result.metadata.trialMode).toBe(false);
    expect(invocations).toHaveLength(2);
    expect(invocations[0]).toMatchObject({
      args: ["-ll", licenseKey]
    });
    expect(invocations[1]?.args).toEqual([
      "-a2",
      "-x",
      "Natural",
      "-h",
      "remove",
      "-s",
      "jpg",
      "-o",
      "/out/licensed-bracket",
      "/in/0ev.jpg",
      "/in/plus2.jpg",
      "/in/minus2.jpg"
    ]);
    expect(result.commandRedacted).not.toContain("-trial");
    expect(result.commandRedacted).not.toContain(licenseKey);
  });

  it("redacts license values from commands and captured output", async () => {
    const licenseKey = "secret-license-value";
    const engine = new PhotomatixCliEngine({
      executablePath: "/opt/photomatixcl/PhotomatixCL",
      licenseKey,
      checkExecutable: async () => true,
      runCommand: async () => ({
        exitCode: 1,
        timedOut: false,
        stdout: `license ${licenseKey} rejected`,
        stderr: `bad key ${licenseKey}`
      })
    });

    const result = await engine.render({
      inputFilePaths: ["/in/a.jpg", "/in/b.jpg", "/in/c.jpg"],
      outputDirectory: "/out"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("photomatixcl_license_failed");
    expect(result.commandRedacted).not.toContain(licenseKey);
    expect(result.stdoutRedacted).not.toContain(licenseKey);
    expect(result.stderrRedacted).not.toContain(licenseKey);
    expect(result.commandRedacted).toContain("[REDACTED]");
    expect(result.stdoutRedacted).toContain("[REDACTED]");
    expect(result.stderrRedacted).toContain("[REDACTED]");
  });

  it("loads PhotomatixCL licenses with the documented -ll command shape", async () => {
    const licenseKey = "secret-license-value";
    const invocations: CommandInvocation[] = [];
    const engine = new PhotomatixCliEngine({
      executablePath: "/opt/photomatixcl/PhotomatixCL",
      licenseKey,
      checkExecutable: async () => true,
      runCommand: async (input) => {
        invocations.push(input);
        return {
          exitCode: 0,
          timedOut: false,
          stdout: "license loaded",
          stderr: ""
        };
      }
    });

    const result = await engine.checkLicense(3_000);

    expect(result.success).toBe(true);
    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toMatchObject({
      executablePath: "/opt/photomatixcl/PhotomatixCL",
      args: ["-ll", licenseKey],
      timeoutMs: 3_000
    });
    expect(result.commandRedacted).not.toContain(licenseKey);
    expect(result.commandRedacted).toContain("[REDACTED]");
  });

  it("returns a structured error when PhotomatixCL is missing", async () => {
    const engine = new PhotomatixCliEngine({
      executablePath: "/missing/PhotomatixCL",
      checkExecutable: async () => false
    });

    const result = await engine.render({
      inputFilePaths: ["/in/a.jpg", "/in/b.jpg", "/in/c.jpg"],
      outputDirectory: "/out"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("photomatixcl_missing_or_not_executable");
    expect(result.exitCode).toBeNull();
    expect(result.outputPaths).toEqual([]);
  });

  it("returns a structured timeout result", async () => {
    const engine = new PhotomatixCliEngine({
      executablePath: "/opt/photomatixcl/PhotomatixCL",
      checkExecutable: async () => true,
      runCommand: async () => ({
        exitCode: null,
        timedOut: true,
        stdout: "",
        stderr: "still running"
      })
    });

    const result = await engine.render({
      inputFilePaths: ["/in/a.jpg", "/in/b.jpg", "/in/c.jpg"],
      outputDirectory: "/out",
      timeoutMs: 5
    });

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.error).toBe("photomatixcl_timeout");
  });

  it("redacts arbitrary command strings", () => {
    expect(redactSecrets("use secret-license-value", ["secret-license-value"])).toBe(
      "use [REDACTED]"
    );
    expect(
      buildRedactedCommand("/bin/tool", ["-ll", "secret-license-value"], ["secret-license-value"])
    ).toBe("/bin/tool -ll '[REDACTED]'");
  });
});
