import { describe, expect, it } from "vitest";
import type {
  Asset,
  BracketGroup,
  HdrEngineMode,
  HdrExport,
  HdrJob,
  JobStatus,
  StorageAdapter
} from "@structure-locked-hdr/core";
import {
  handleCreateHdrJobForBracketGroup,
  handleDownloadExport,
  handleListHdrJobsForShoot,
  handleProcessHdrJob,
  type HdrJobRouteDeps
} from "../src/lib/hdr-job-route-handlers";

const now = new Date("2026-06-28T12:00:00Z");

const asset: Asset & { sortOrder: number } = {
  id: "asset-1",
  shootId: "shoot-1",
  uploadBatchId: "batch-1",
  originalFilename: "front.jpg",
  storageKey: "shoots/shoot-1/uploads/batch-1/originals/asset-1-front.jpg",
  thumbnailStorageKey: "shoots/shoot-1/uploads/batch-1/thumbnails/asset-1.jpg",
  mimeType: "image/jpeg",
  fileExt: ".jpg",
  fileSizeBytes: 1000,
  width: 1920,
  height: 1080,
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

function group(status: BracketGroup["status"]): BracketGroup {
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
    reviewedAt: status === "pending_review" ? null : now,
    approvedAt: status === "approved" ? now : null,
    createdAt: now,
    assets: [asset]
  };
}

function job(
  overrides: Partial<HdrJob> & {
    id?: string;
    status?: JobStatus;
    engineMode?: HdrEngineMode;
  } = {}
): HdrJob {
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

function hdrExport(overrides: Partial<HdrExport> = {}): HdrExport {
  return {
    id: overrides.id ?? "export-1",
    shootId: overrides.shootId ?? "shoot-1",
    hdrJobId: overrides.hdrJobId ?? "job-1",
    kind: overrides.kind ?? "mls_jpeg",
    storageKey: overrides.storageKey ?? "shoots/shoot-1/jobs/job-1/exports/mls-placeholder.txt",
    mimeType: overrides.mimeType ?? "text/plain; charset=utf-8",
    width: overrides.width ?? null,
    height: overrides.height ?? null,
    fileSizeBytes: overrides.fileSizeBytes ?? 18,
    createdAt: overrides.createdAt ?? now
  };
}

function makeStorage(body = Buffer.from("fake export body")): StorageAdapter {
  return {
    async putObject(input) {
      return {
        key: input.key,
        metadata: input.metadata
      };
    },
    async getObject(key) {
      return key.includes("missing")
        ? null
        : {
            key,
            body,
            metadata: {
              contentType: "text/plain; charset=utf-8",
              sizeBytes: body.byteLength
            }
          };
    },
    async deleteObject() {}
  };
}

function makeDeps(
  overrides: Partial<HdrJobRouteDeps> & {
    groupStatus?: BracketGroup["status"];
    jobs?: HdrJob[];
    exports?: HdrExport[];
  } = {}
): HdrJobRouteDeps {
  const jobs = overrides.jobs ?? [];
  const exports = overrides.exports ?? [];

  return {
    storage: overrides.storage ?? makeStorage(),
    defaultEngineMode: overrides.defaultEngineMode ?? "fake",
    getBracketGroupWithAssets:
      overrides.getBracketGroupWithAssets ??
      (async () => group(overrides.groupStatus ?? "approved")),
    createHdrJob:
      overrides.createHdrJob ??
      (async (input) => {
        const created = job({
          id: "job-created",
          shootId: input.shootId,
          bracketGroupId: input.bracketGroupId,
          preset: input.preset,
          engineMode: input.engineMode,
          outputMlsJpeg: input.outputMlsJpeg,
          outputFullJpeg: input.outputFullJpeg,
          outputTiff: input.outputTiff
        });
        jobs.push(created);
        return created;
      }),
    getHdrJob:
      overrides.getHdrJob ?? (async (jobId) => jobs.find((hdrJob) => hdrJob.id === jobId) ?? null),
    listHdrJobsForShoot: overrides.listHdrJobsForShoot ?? (async () => jobs),
    listHdrJobsForBracketGroup:
      overrides.listHdrJobsForBracketGroup ??
      (async (groupId) => jobs.filter((hdrJob) => hdrJob.bracketGroupId === groupId)),
    updateHdrJobStatus:
      overrides.updateHdrJobStatus ??
      (async (jobId, status) => {
        const existingJob = jobs.find((hdrJob) => hdrJob.id === jobId);
        return existingJob ? { ...existingJob, status } : null;
      }),
    listExportsForJob:
      overrides.listExportsForJob ??
      (async (jobId) => exports.filter((hdrExport) => hdrExport.hdrJobId === jobId)),
    listExportsForShoot:
      overrides.listExportsForShoot ??
      (async (shootId) => exports.filter((hdrExport) => hdrExport.shootId === shootId)),
    getExport:
      overrides.getExport ??
      (async (exportId) => exports.find((hdrExport) => hdrExport.id === exportId) ?? null),
    processHdrJob: overrides.processHdrJob ?? (async () => null)
  };
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/bracket-groups/group-1/hdr-jobs", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json"
    }
  });
}

describe("HDR job route handlers", () => {
  it("rejects job creation for unapproved groups", async () => {
    const response = await handleCreateHdrJobForBracketGroup(
      jsonRequest({}),
      "group-1",
      makeDeps({
        groupStatus: "pending_review"
      })
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("bracket_group_not_approved");
  });

  it("creates a fake job for an approved group without exposing storage keys", async () => {
    const response = await handleCreateHdrJobForBracketGroup(
      jsonRequest({
        outputMlsJpeg: true,
        outputFullJpeg: false,
        outputTiff: true
      }),
      "group-1",
      makeDeps()
    );
    const body = (await response.json()) as { hdrJob: Record<string, unknown> };

    expect(response.status).toBe(201);
    expect(body.hdrJob).toMatchObject({
      id: "job-created",
      status: "queued",
      engineMode: "fake",
      outputMlsJpeg: true,
      outputFullJpeg: false,
      outputTiff: true
    });
    expect(JSON.stringify(body)).not.toContain("storageKey");
  });

  it("rejects job creation with no requested exports", async () => {
    const response = await handleCreateHdrJobForBracketGroup(
      jsonRequest({
        outputMlsJpeg: false,
        outputFullJpeg: false,
        outputTiff: false
      }),
      "group-1",
      makeDeps()
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("no_outputs_requested");
  });

  it("lists jobs with API download URLs and no local storage paths", async () => {
    const response = await handleListHdrJobsForShoot(
      "shoot-1",
      makeDeps({
        jobs: [job({ status: "succeeded", commandRedacted: "fake [LOCAL_STORAGE_ROOT]/job" })],
        exports: [hdrExport()]
      }),
      {
        mode: "api"
      }
    );
    const body = (await response.json()) as { hdrJobs: Record<string, unknown>[] };

    expect(body.hdrJobs[0]).toMatchObject({
      id: "job-1",
      status: "succeeded"
    });
    expect(JSON.stringify(body)).toContain("/api/v1/exports/export-1/download");
    expect(JSON.stringify(body)).not.toContain("shoots/shoot-1/jobs");
    expect(JSON.stringify(body)).not.toContain("storageKey");
  });

  it("returns processed job details without raw engine output paths", async () => {
    const succeededJob = job({
      status: "succeeded",
      commandRedacted: "fake-hdr-engine --output [LOCAL_STORAGE_ROOT]/jobs/job-1"
    });
    const response = await handleProcessHdrJob(
      "job-1",
      makeDeps({
        processHdrJob: async () => ({
          hdrJob: succeededJob,
          exports: [hdrExport()],
          engineResult: {
            engine: "fake",
            success: true,
            exitCode: 0,
            timedOut: false,
            commandRedacted: succeededJob.commandRedacted ?? "",
            stdoutRedacted: "ok",
            stderrRedacted: "",
            outputPaths: ["[LOCAL_STORAGE_ROOT]/jobs/job-1/engine-output/job-1.jpg"],
            error: null,
            metadata: {
              inputCount: 3
            }
          }
        })
      })
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain("outputPaths");
    expect(JSON.stringify(body)).not.toContain("/tmp");
  });

  it("downloads an export body through storage", async () => {
    const response = await handleDownloadExport(
      "export-1",
      makeDeps({
        exports: [hdrExport()]
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(await response.text()).toBe("fake export body");
  });
});
