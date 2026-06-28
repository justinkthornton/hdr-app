import {
  sanitizeFilename,
  type BracketGroup,
  type HdrEngineMode,
  type HdrExport,
  type HdrJob,
  type StorageAdapter
} from "@structure-locked-hdr/core";
import type { HdrRenderResult } from "@structure-locked-hdr/core/hdr";
import { jsonResponse, parseJsonBody } from "./http";
import type { HdrJobRunResult } from "./hdr-job-runner";

export type HdrJobRouteOptions = {
  mode?: "admin" | "api";
};

export type HdrJobRouteDeps = {
  storage: StorageAdapter;
  defaultEngineMode: HdrEngineMode;
  getBracketGroupWithAssets(groupId: string): Promise<BracketGroup | null>;
  createHdrJob(input: {
    shootId: string;
    bracketGroupId: string;
    preset?: string;
    engineMode?: HdrEngineMode;
    outputMlsJpeg?: boolean;
    outputFullJpeg?: boolean;
    outputTiff?: boolean;
  }): Promise<HdrJob>;
  getHdrJob(jobId: string): Promise<HdrJob | null>;
  listHdrJobsForShoot(shootId: string): Promise<HdrJob[]>;
  listHdrJobsForBracketGroup(bracketGroupId: string): Promise<HdrJob[]>;
  updateHdrJobStatus(jobId: string, status: HdrJob["status"]): Promise<HdrJob | null>;
  listExportsForJob(jobId: string): Promise<HdrExport[]>;
  listExportsForShoot(shootId: string): Promise<HdrExport[]>;
  getExport(exportId: string): Promise<HdrExport | null>;
  processHdrJob(jobId: string): Promise<HdrJobRunResult | null>;
};

type CreateHdrJobRequest = {
  preset?: unknown;
  engineMode?: unknown;
  outputMlsJpeg?: unknown;
  outputFullJpeg?: unknown;
  outputTiff?: unknown;
};

function downloadPrefix(options: HdrJobRouteOptions): string {
  return options.mode === "api" ? "/api/v1" : "/api";
}

function serializeHdrExport(
  hdrExport: HdrExport,
  options: HdrJobRouteOptions = {}
): Record<string, unknown> {
  return {
    id: hdrExport.id,
    shootId: hdrExport.shootId,
    hdrJobId: hdrExport.hdrJobId,
    kind: hdrExport.kind,
    mimeType: hdrExport.mimeType,
    width: hdrExport.width,
    height: hdrExport.height,
    fileSizeBytes: hdrExport.fileSizeBytes,
    createdAt: hdrExport.createdAt.toISOString(),
    downloadUrl: `${downloadPrefix(options)}/exports/${hdrExport.id}/download`
  };
}

function serializeHdrJob(
  hdrJob: HdrJob,
  exports: HdrExport[] = [],
  options: HdrJobRouteOptions = {}
): Record<string, unknown> {
  return {
    id: hdrJob.id,
    shootId: hdrJob.shootId,
    bracketGroupId: hdrJob.bracketGroupId,
    status: hdrJob.status,
    engineMode: hdrJob.engineMode,
    preset: hdrJob.preset,
    outputMlsJpeg: hdrJob.outputMlsJpeg,
    outputFullJpeg: hdrJob.outputFullJpeg,
    outputTiff: hdrJob.outputTiff,
    startedAt: hdrJob.startedAt?.toISOString() ?? null,
    finishedAt: hdrJob.finishedAt?.toISOString() ?? null,
    errorMessage: hdrJob.errorMessage,
    commandRedacted: hdrJob.commandRedacted,
    createdAt: hdrJob.createdAt.toISOString(),
    updatedAt: hdrJob.updatedAt.toISOString(),
    exports: exports.map((hdrExport) => serializeHdrExport(hdrExport, options))
  };
}

function serializeEngineResult(
  engineResult: HdrRenderResult | null
): Record<string, unknown> | null {
  if (!engineResult) {
    return null;
  }

  return {
    engine: engineResult.engine,
    success: engineResult.success,
    exitCode: engineResult.exitCode,
    timedOut: engineResult.timedOut,
    error: engineResult.error,
    metadata: engineResult.metadata
  };
}

function exportsByJobId(exports: HdrExport[]): Map<string, HdrExport[]> {
  const grouped = new Map<string, HdrExport[]>();

  for (const hdrExport of exports) {
    grouped.set(hdrExport.hdrJobId, [...(grouped.get(hdrExport.hdrJobId) ?? []), hdrExport]);
  }

  return grouped;
}

function booleanFromBody(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function engineModeFromBody(value: unknown, fallback: HdrEngineMode): HdrEngineMode | "invalid" {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (value === "fake") {
    return "fake";
  }

  if (value === "photomatix" || value === "photomatix-cli") {
    return "photomatix";
  }

  return "invalid";
}

function requestedPreset(value: unknown): string | "invalid" | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    return "invalid";
  }

  const preset = value.trim();
  return preset.length > 0 && preset.length <= 80 ? preset : "invalid";
}

function extensionForExport(hdrExport: HdrExport): string {
  if (hdrExport.mimeType.startsWith("image/jpeg")) {
    return "jpg";
  }

  if (hdrExport.mimeType.startsWith("image/tiff")) {
    return "tif";
  }

  return "txt";
}

export async function handleListHdrJobsForShoot(
  shootId: string,
  deps: HdrJobRouteDeps,
  options: HdrJobRouteOptions = {}
): Promise<Response> {
  const [hdrJobs, hdrExports] = await Promise.all([
    deps.listHdrJobsForShoot(shootId),
    deps.listExportsForShoot(shootId)
  ]);
  const groupedExports = exportsByJobId(hdrExports);

  return jsonResponse({
    hdrJobs: hdrJobs.map((hdrJob) =>
      serializeHdrJob(hdrJob, groupedExports.get(hdrJob.id) ?? [], options)
    )
  });
}

export async function handleListHdrJobsForBracketGroup(
  groupId: string,
  deps: HdrJobRouteDeps,
  options: HdrJobRouteOptions = {}
): Promise<Response> {
  const hdrJobs = await deps.listHdrJobsForBracketGroup(groupId);
  const jobExports = await Promise.all(hdrJobs.map((hdrJob) => deps.listExportsForJob(hdrJob.id)));

  return jsonResponse({
    hdrJobs: hdrJobs.map((hdrJob, index) =>
      serializeHdrJob(hdrJob, jobExports[index] ?? [], options)
    )
  });
}

export async function handleCreateHdrJobForBracketGroup(
  request: Request,
  groupId: string,
  deps: HdrJobRouteDeps,
  options: HdrJobRouteOptions = {}
): Promise<Response> {
  const group = await deps.getBracketGroupWithAssets(groupId);

  if (!group) {
    return jsonResponse(
      {
        error: "bracket_group_not_found"
      },
      {
        status: 404
      }
    );
  }

  if (group.status !== "approved") {
    return jsonResponse(
      {
        error: "bracket_group_not_approved"
      },
      {
        status: 400
      }
    );
  }

  const body = ((await parseJsonBody(request)) ?? {}) as CreateHdrJobRequest;
  const preset = requestedPreset(body.preset);
  const engineMode = engineModeFromBody(body.engineMode, deps.defaultEngineMode);
  const outputMlsJpeg = booleanFromBody(body.outputMlsJpeg, true);
  const outputFullJpeg = booleanFromBody(body.outputFullJpeg, true);
  const outputTiff = booleanFromBody(body.outputTiff, false);

  if (preset === "invalid") {
    return jsonResponse(
      {
        error: "invalid_preset"
      },
      {
        status: 400
      }
    );
  }

  if (engineMode === "invalid") {
    return jsonResponse(
      {
        error: "invalid_engine_mode"
      },
      {
        status: 400
      }
    );
  }

  if (!outputMlsJpeg && !outputFullJpeg && !outputTiff) {
    return jsonResponse(
      {
        error: "no_outputs_requested"
      },
      {
        status: 400
      }
    );
  }

  const createInput: Parameters<HdrJobRouteDeps["createHdrJob"]>[0] = {
    shootId: group.shootId,
    bracketGroupId: group.id,
    engineMode,
    outputMlsJpeg,
    outputFullJpeg,
    outputTiff
  };

  if (preset !== undefined) {
    createInput.preset = preset;
  }

  const hdrJob = await deps.createHdrJob(createInput);

  return jsonResponse(
    {
      hdrJob: serializeHdrJob(hdrJob, [], options)
    },
    {
      status: 201
    }
  );
}

export async function handleGetHdrJob(
  jobId: string,
  deps: HdrJobRouteDeps,
  options: HdrJobRouteOptions = {}
): Promise<Response> {
  const hdrJob = await deps.getHdrJob(jobId);

  if (!hdrJob) {
    return jsonResponse(
      {
        error: "hdr_job_not_found"
      },
      {
        status: 404
      }
    );
  }

  const exports = await deps.listExportsForJob(jobId);

  return jsonResponse({
    hdrJob: serializeHdrJob(hdrJob, exports, options)
  });
}

export async function handleProcessHdrJob(
  jobId: string,
  deps: HdrJobRouteDeps,
  options: HdrJobRouteOptions = {}
): Promise<Response> {
  const result = await deps.processHdrJob(jobId);

  if (!result) {
    return jsonResponse(
      {
        error: "hdr_job_not_found"
      },
      {
        status: 404
      }
    );
  }

  return jsonResponse({
    hdrJob: serializeHdrJob(result.hdrJob, result.exports, options),
    engineResult: serializeEngineResult(result.engineResult)
  });
}

export async function handleListExportsForJob(
  jobId: string,
  deps: HdrJobRouteDeps,
  options: HdrJobRouteOptions = {}
): Promise<Response> {
  const hdrJob = await deps.getHdrJob(jobId);

  if (!hdrJob) {
    return jsonResponse(
      {
        error: "hdr_job_not_found"
      },
      {
        status: 404
      }
    );
  }

  const exports = await deps.listExportsForJob(jobId);

  return jsonResponse({
    exports: exports.map((hdrExport) => serializeHdrExport(hdrExport, options))
  });
}

export async function handleDownloadExport(
  exportId: string,
  deps: HdrJobRouteDeps
): Promise<Response> {
  const hdrExport = await deps.getExport(exportId);

  if (!hdrExport) {
    return jsonResponse(
      {
        error: "export_not_found"
      },
      {
        status: 404
      }
    );
  }

  const stored = await deps.storage.getObject(hdrExport.storageKey);

  if (!stored?.body) {
    return jsonResponse(
      {
        error: "export_file_not_found"
      },
      {
        status: 404
      }
    );
  }

  const filename = sanitizeFilename(
    `${hdrExport.kind}-${hdrExport.id}.${extensionForExport(hdrExport)}`
  );

  return new Response(new Uint8Array(stored.body), {
    headers: {
      "cache-control": "private, max-age=3600",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(stored.body.byteLength),
      "content-type": hdrExport.mimeType
    }
  });
}
