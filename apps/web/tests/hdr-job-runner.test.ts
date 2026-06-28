import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type {
  Asset,
  BracketGroup,
  HdrExport,
  HdrJob,
  StorageAdapter
} from "@structure-locked-hdr/core";
import { processHdrJob } from "../src/lib/hdr-job-runner";

const now = new Date("2026-06-28T12:00:00Z");

function asset(): Asset & { sortOrder: number } {
  return {
    id: "asset-1",
    shootId: "shoot-1",
    uploadBatchId: "batch-1",
    originalFilename: "0ev.jpg",
    storageKey: "shoots/shoot-1/uploads/batch-1/originals/asset-1-0ev.jpg",
    thumbnailStorageKey: null,
    mimeType: "image/jpeg",
    fileExt: ".jpg",
    fileSizeBytes: 12,
    width: 1200,
    height: 800,
    cameraModel: "Canon EOS R5",
    lensModel: null,
    capturedAt: now,
    exposureTime: "1/125",
    aperture: "f/8",
    iso: 200,
    exposureBias: null,
    rawMetadata: {
      extractionStatus: "extracted"
    },
    createdAt: now,
    sortOrder: 1
  };
}

function group(status: BracketGroup["status"] = "approved"): BracketGroup {
  return {
    id: "group-1",
    shootId: "shoot-1",
    uploadBatchId: "batch-1",
    status,
    groupIndex: 1,
    expectedCount: 3,
    detectedCount: 3,
    confidence: 0.98,
    groupingReason: "test group",
    reviewedAt: now,
    approvedAt: status === "approved" ? now : null,
    createdAt: now,
    assets: [asset()]
  };
}

function job(overrides: Partial<HdrJob> = {}): HdrJob {
  return {
    id: overrides.id ?? "job-1",
    shootId: overrides.shootId ?? "shoot-1",
    bracketGroupId: overrides.bracketGroupId ?? "group-1",
    status: overrides.status ?? "queued",
    engineMode: overrides.engineMode ?? "fake",
    preset: overrides.preset ?? "Natural",
    outputMlsJpeg: overrides.outputMlsJpeg ?? true,
    outputFullJpeg: overrides.outputFullJpeg ?? true,
    outputTiff: overrides.outputTiff ?? false,
    startedAt: overrides.startedAt ?? null,
    finishedAt: overrides.finishedAt ?? null,
    errorMessage: overrides.errorMessage ?? null,
    commandRedacted: overrides.commandRedacted ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now
  };
}

function makeStorage(): StorageAdapter & { read(key: string): Buffer | null } {
  const objects = new Map<string, Buffer>([
    ["shoots/shoot-1/uploads/batch-1/originals/asset-1-0ev.jpg", Buffer.from("jpeg bytes")]
  ]);

  return {
    async putObject(input) {
      const body = Buffer.isBuffer(input.body)
        ? input.body
        : Buffer.from(await new Response(input.body).arrayBuffer());
      objects.set(input.key, body);
      return {
        key: input.key,
        metadata: {
          ...input.metadata,
          sizeBytes: body.byteLength
        }
      };
    },
    async getObject(key) {
      const body = objects.get(key);
      return body
        ? {
            key,
            body,
            metadata: {
              contentType: "application/octet-stream",
              sizeBytes: body.byteLength
            }
          }
        : null;
    },
    async deleteObject(key) {
      objects.delete(key);
    },
    read(key) {
      return objects.get(key) ?? null;
    }
  };
}

describe("HDR job runner", () => {
  it("runs the fake engine and creates placeholder exports through storage", async () => {
    const storage = makeStorage();
    const localStorageRoot = await mkdtemp(path.join(os.tmpdir(), "hdr-runner-"));
    const exports: HdrExport[] = [];
    let currentJob = job();

    const result = await processHdrJob(currentJob.id, {
      storage,
      localStorageRoot,
      photomatixclPath: "",
      getHdrJob: async () => currentJob,
      getBracketGroupWithAssets: async () => group(),
      markHdrJobRunning: async () => {
        currentJob = {
          ...currentJob,
          status: "running",
          startedAt: now
        };
        return currentJob;
      },
      markHdrJobSucceeded: async (_jobId, input) => {
        currentJob = {
          ...currentJob,
          status: "succeeded",
          finishedAt: now,
          commandRedacted: input.commandRedacted
        };
        return currentJob;
      },
      markHdrJobFailed: async (_jobId, input) => {
        currentJob = {
          ...currentJob,
          status: "failed",
          errorMessage: input.errorMessage,
          commandRedacted: input.commandRedacted ?? null
        };
        return currentJob;
      },
      createExport: async (input) => {
        const created: HdrExport = {
          id: `export-${exports.length + 1}`,
          shootId: input.shootId,
          hdrJobId: input.hdrJobId,
          kind: input.kind,
          storageKey: input.storageKey,
          mimeType: input.mimeType,
          width: input.width ?? null,
          height: input.height ?? null,
          fileSizeBytes: input.fileSizeBytes ?? null,
          createdAt: now
        };
        exports.push(created);
        return created;
      },
      listExportsForJob: async () => exports
    });

    expect(result?.hdrJob.status).toBe("succeeded");
    expect(result?.exports).toHaveLength(2);
    expect(result?.hdrJob.commandRedacted).toContain("[LOCAL_STORAGE_ROOT]");
    expect(result?.hdrJob.commandRedacted).not.toContain(localStorageRoot);

    const firstExport = result?.exports[0];
    expect(firstExport).toBeDefined();
    expect(firstExport?.mimeType).toBe("text/plain; charset=utf-8");
    expect(storage.read(firstExport!.storageKey)?.toString("utf8")).toContain(
      "Phase 2C placeholder, not a real HDR image"
    );
  });

  it("marks Photomatix jobs failed when the binary is not configured", async () => {
    const storage = makeStorage();
    const localStorageRoot = await mkdtemp(path.join(os.tmpdir(), "hdr-runner-"));
    let currentJob = job({
      engineMode: "photomatix"
    });

    const result = await processHdrJob(currentJob.id, {
      storage,
      localStorageRoot,
      photomatixclPath: "",
      getHdrJob: async () => currentJob,
      getBracketGroupWithAssets: async () => group(),
      markHdrJobRunning: async () => {
        currentJob = {
          ...currentJob,
          status: "running",
          startedAt: now
        };
        return currentJob;
      },
      markHdrJobSucceeded: async (_jobId, input) => {
        currentJob = {
          ...currentJob,
          status: "succeeded",
          commandRedacted: input.commandRedacted
        };
        return currentJob;
      },
      markHdrJobFailed: async (_jobId, input) => {
        currentJob = {
          ...currentJob,
          status: "failed",
          errorMessage: input.errorMessage,
          commandRedacted: input.commandRedacted ?? null
        };
        return currentJob;
      },
      createExport: async () => {
        throw new Error("unexpected_export");
      },
      listExportsForJob: async () => []
    });

    expect(result?.hdrJob.status).toBe("failed");
    expect(result?.hdrJob.errorMessage).toBe("photomatixcl_missing_or_not_executable");
    expect(result?.exports).toHaveLength(0);
  });

  it("imports a Photomatix output file into requested exports", async () => {
    const storage = makeStorage();
    const localStorageRoot = await mkdtemp(path.join(os.tmpdir(), "hdr-runner-"));
    const exports: HdrExport[] = [];
    let currentJob = job({
      engineMode: "photomatix"
    });

    const result = await processHdrJob(currentJob.id, {
      storage,
      localStorageRoot,
      photomatixclPath: "/opt/photomatixcl-local/PhotomatixCL",
      photomatixCheckExecutable: async () => true,
      photomatixRunCommand: async (input) => {
        const outputStem = input.args[input.args.indexOf("-o") + 1]!;
        await mkdir(path.dirname(outputStem), {
          recursive: true
        });
        await writeFile(`${outputStem}.jpg`, Buffer.from("fake real photomatix jpeg"));
        return {
          exitCode: 0,
          timedOut: false,
          stdout: `wrote ${outputStem}.jpg`,
          stderr: ""
        };
      },
      getHdrJob: async () => currentJob,
      getBracketGroupWithAssets: async () => group(),
      markHdrJobRunning: async () => {
        currentJob = {
          ...currentJob,
          status: "running",
          startedAt: now
        };
        return currentJob;
      },
      markHdrJobSucceeded: async (_jobId, input) => {
        currentJob = {
          ...currentJob,
          status: "succeeded",
          finishedAt: now,
          commandRedacted: input.commandRedacted
        };
        return currentJob;
      },
      markHdrJobFailed: async (_jobId, input) => {
        currentJob = {
          ...currentJob,
          status: "failed",
          errorMessage: input.errorMessage,
          commandRedacted: input.commandRedacted ?? null
        };
        return currentJob;
      },
      createExport: async (input) => {
        const created: HdrExport = {
          id: `export-${exports.length + 1}`,
          shootId: input.shootId,
          hdrJobId: input.hdrJobId,
          kind: input.kind,
          storageKey: input.storageKey,
          mimeType: input.mimeType,
          width: input.width ?? null,
          height: input.height ?? null,
          fileSizeBytes: input.fileSizeBytes ?? null,
          createdAt: now
        };
        exports.push(created);
        return created;
      },
      listExportsForJob: async () => exports
    });

    expect(result?.hdrJob.status).toBe("succeeded");
    expect(result?.hdrJob.commandRedacted).toContain("[LOCAL_STORAGE_ROOT]");
    expect(result?.hdrJob.commandRedacted).toContain("[PHOTOMATIXCL_PATH]");
    expect(result?.exports).toHaveLength(2);
    expect(result?.exports.map((hdrExport) => hdrExport.kind)).toEqual(["mls_jpeg", "full_jpeg"]);
    expect(result?.exports.every((hdrExport) => hdrExport.mimeType === "image/jpeg")).toBe(true);
    expect(storage.read(result!.exports[0]!.storageKey)?.toString("utf8")).toBe(
      "fake real photomatix jpeg"
    );
    expect(result?.hdrJob.commandRedacted).not.toContain(localStorageRoot);
    expect(result?.hdrJob.commandRedacted).not.toContain("/opt/photomatixcl-local/PhotomatixCL");
  });
});
