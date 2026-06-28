import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildExportStorageKey,
  sanitizeFilename,
  type BracketGroup,
  type ExportKind,
  type HdrExport,
  type HdrJob,
  type StorageAdapter
} from "@structure-locked-hdr/core";
import {
  FakeHdrEngine,
  PhotomatixCliEngine,
  type CommandInvocation,
  type CommandRunResult,
  type HdrRenderResult
} from "@structure-locked-hdr/core/hdr";

export type HdrJobRunnerDeps = {
  storage: StorageAdapter;
  localStorageRoot: string;
  photomatixclPath: string;
  photomatixLicenseKey?: string;
  photomatixCheckExecutable?: (executablePath: string) => Promise<boolean>;
  photomatixRunCommand?: (input: CommandInvocation) => Promise<CommandRunResult>;
  getHdrJob(jobId: string): Promise<HdrJob | null>;
  getBracketGroupWithAssets(groupId: string): Promise<BracketGroup | null>;
  markHdrJobRunning(jobId: string): Promise<HdrJob | null>;
  markHdrJobSucceeded(
    jobId: string,
    input: {
      commandRedacted: string | null;
    }
  ): Promise<HdrJob | null>;
  markHdrJobFailed(
    jobId: string,
    input: {
      errorMessage: string;
      commandRedacted?: string | null;
    }
  ): Promise<HdrJob | null>;
  createExport(input: {
    shootId: string;
    hdrJobId: string;
    kind: ExportKind;
    storageKey: string;
    mimeType: string;
    width?: number | null;
    height?: number | null;
    fileSizeBytes?: number | null;
  }): Promise<HdrExport>;
  listExportsForJob(jobId: string): Promise<HdrExport[]>;
};

export type HdrJobRunResult = {
  hdrJob: HdrJob;
  exports: HdrExport[];
  engineResult: HdrRenderResult | null;
};

const exportLabels: Record<ExportKind, string> = {
  mls_jpeg: "MLS JPEG",
  full_jpeg: "Full JPEG",
  tiff: "TIFF"
};

const exportFilenames: Record<ExportKind, string> = {
  mls_jpeg: "mls-placeholder.txt",
  full_jpeg: "full-placeholder.txt",
  tiff: "tiff-placeholder.txt"
};

function requestedExportKinds(job: HdrJob): ExportKind[] {
  return [
    job.outputMlsJpeg ? "mls_jpeg" : null,
    job.outputFullJpeg ? "full_jpeg" : null,
    job.outputTiff ? "tiff" : null
  ].filter((kind): kind is ExportKind => Boolean(kind));
}

function resolveInsideRoot(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...segments);

  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Resolved job path outside LOCAL_STORAGE_ROOT.");
  }

  return resolvedPath;
}

async function stageInputFiles(
  group: BracketGroup,
  deps: HdrJobRunnerDeps,
  jobId: string
): Promise<string[]> {
  const inputDirectory = resolveInsideRoot(deps.localStorageRoot, "jobs", jobId, "inputs");
  await mkdir(inputDirectory, {
    recursive: true
  });

  const inputPaths: string[] = [];

  for (const asset of group.assets) {
    const stored = await deps.storage.getObject(asset.storageKey);

    if (!stored?.body) {
      throw new Error(`asset_storage_missing:${asset.id}`);
    }

    const stagedFilename = `${asset.sortOrder}-${asset.id}-${sanitizeFilename(asset.originalFilename)}`;
    const stagedPath = resolveInsideRoot(
      deps.localStorageRoot,
      "jobs",
      jobId,
      "inputs",
      stagedFilename
    );

    await writeFile(stagedPath, stored.body);
    inputPaths.push(stagedPath);
  }

  return inputPaths;
}

function fakeExportBody(input: {
  job: HdrJob;
  group: BracketGroup;
  kind: ExportKind;
  engineResult: HdrRenderResult;
}): Buffer {
  return Buffer.from(
    [
      `Fake HDR export for bracket group ${input.group.id}.`,
      "This is a Phase 2C placeholder, not a real HDR image.",
      `Export kind: ${exportLabels[input.kind]}.`,
      `Job id: ${input.job.id}.`,
      `Preset: ${input.job.preset}.`,
      `Command: ${input.engineResult.commandRedacted}.`
    ].join("\n"),
    "utf8"
  );
}

async function createFakeExports(input: {
  job: HdrJob;
  group: BracketGroup;
  engineResult: HdrRenderResult;
  deps: HdrJobRunnerDeps;
}): Promise<HdrExport[]> {
  const exports: HdrExport[] = [];

  for (const kind of requestedExportKinds(input.job)) {
    const body = fakeExportBody({
      job: input.job,
      group: input.group,
      kind,
      engineResult: input.engineResult
    });
    const storageKey = buildExportStorageKey({
      shootId: input.job.shootId,
      jobId: input.job.id,
      filename: exportFilenames[kind]
    });

    await input.deps.storage.putObject({
      key: storageKey,
      body,
      metadata: {
        contentType: "text/plain; charset=utf-8",
        sizeBytes: body.byteLength
      }
    });

    exports.push(
      await input.deps.createExport({
        shootId: input.job.shootId,
        hdrJobId: input.job.id,
        kind,
        storageKey,
        mimeType: "text/plain; charset=utf-8",
        fileSizeBytes: body.byteLength
      })
    );
  }

  return exports;
}

function engineForJob(job: HdrJob, deps: HdrJobRunnerDeps): FakeHdrEngine | PhotomatixCliEngine {
  if (job.engineMode === "photomatix") {
    const options: ConstructorParameters<typeof PhotomatixCliEngine>[0] = {
      executablePath: deps.photomatixclPath
    };

    if (deps.photomatixLicenseKey) {
      options.licenseKey = deps.photomatixLicenseKey;
    }

    if (deps.photomatixCheckExecutable) {
      options.checkExecutable = deps.photomatixCheckExecutable;
    }

    if (deps.photomatixRunCommand) {
      options.runCommand = deps.photomatixRunCommand;
    }

    return new PhotomatixCliEngine(options);
  }

  return new FakeHdrEngine();
}

function outputFormatForJob(job: HdrJob): "jpg" | "tif" {
  return job.outputTiff && !job.outputMlsJpeg && !job.outputFullJpeg ? "tif" : "jpg";
}

function safeJobError(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("asset_storage_missing:")) {
    return error.message;
  }

  if (error instanceof Error && error.message === "photomatix_output_missing") {
    return error.message;
  }

  return "hdr_job_processing_failed";
}

function replaceAll(value: string, search: string, replacement: string): string {
  return search.length > 0 ? value.split(search).join(replacement) : value;
}

function sanitizeCommandForStorage(command: string, deps: HdrJobRunnerDeps): string {
  return replaceAll(
    replaceAll(command, path.resolve(deps.localStorageRoot), "[LOCAL_STORAGE_ROOT]"),
    deps.photomatixclPath,
    "[PHOTOMATIXCL_PATH]"
  );
}

function sanitizeEngineResult(
  engineResult: HdrRenderResult,
  deps: HdrJobRunnerDeps
): HdrRenderResult {
  return {
    ...engineResult,
    commandRedacted: sanitizeCommandForStorage(engineResult.commandRedacted, deps),
    outputPaths: engineResult.outputPaths.map((outputPath) =>
      replaceAll(outputPath, path.resolve(deps.localStorageRoot), "[LOCAL_STORAGE_ROOT]")
    )
  };
}

async function createPhotomatixExports(input: {
  job: HdrJob;
  engineResult: HdrRenderResult;
  deps: HdrJobRunnerDeps;
}): Promise<HdrExport[]> {
  const firstOutputPath = input.engineResult.outputPaths[0];

  if (!firstOutputPath) {
    throw new Error("photomatix_output_missing");
  }

  const localOutputPath = firstOutputPath.replace(
    "[LOCAL_STORAGE_ROOT]",
    path.resolve(input.deps.localStorageRoot)
  );
  const body = await readFile(localOutputPath).catch(() => null);

  if (!body) {
    throw new Error("photomatix_output_missing");
  }

  const outputFormat = outputFormatForJob(input.job);
  const mimeType = outputFormat === "tif" ? "image/tiff" : "image/jpeg";
  const filename = outputFormat === "tif" ? "photomatix-output.tif" : "photomatix-output.jpg";
  const exports: HdrExport[] = [];

  for (const kind of requestedExportKinds(input.job)) {
    if (kind === "tiff" && outputFormat !== "tif") {
      continue;
    }

    const storageKey = buildExportStorageKey({
      shootId: input.job.shootId,
      jobId: input.job.id,
      filename: kind === "tiff" ? filename : `${kind}-${filename}`
    });

    await input.deps.storage.putObject({
      key: storageKey,
      body,
      metadata: {
        contentType: mimeType,
        sizeBytes: body.byteLength
      }
    });

    exports.push(
      await input.deps.createExport({
        shootId: input.job.shootId,
        hdrJobId: input.job.id,
        kind,
        storageKey,
        mimeType,
        fileSizeBytes: body.byteLength
      })
    );
  }

  return exports;
}

export async function processHdrJob(
  jobId: string,
  deps: HdrJobRunnerDeps
): Promise<HdrJobRunResult | null> {
  const existingJob = await deps.getHdrJob(jobId);

  if (!existingJob) {
    return null;
  }

  if (existingJob.status === "running" || existingJob.status === "succeeded") {
    return {
      hdrJob: existingJob,
      exports: await deps.listExportsForJob(jobId),
      engineResult: null
    };
  }

  const group = await deps.getBracketGroupWithAssets(existingJob.bracketGroupId);

  if (!group) {
    const failed = await deps.markHdrJobFailed(jobId, {
      errorMessage: "bracket_group_not_found"
    });
    return failed
      ? {
          hdrJob: failed,
          exports: [],
          engineResult: null
        }
      : null;
  }

  if (group.status !== "approved") {
    const failed = await deps.markHdrJobFailed(jobId, {
      errorMessage: "bracket_group_not_approved"
    });
    return failed
      ? {
          hdrJob: failed,
          exports: [],
          engineResult: null
        }
      : null;
  }

  const runningJob = await deps.markHdrJobRunning(jobId);

  if (!runningJob) {
    return null;
  }

  try {
    const inputFilePaths = await stageInputFiles(group, deps, jobId);
    const engine = engineForJob(runningJob, deps);
    const outputDirectory = resolveInsideRoot(
      deps.localStorageRoot,
      "jobs",
      jobId,
      "engine-output"
    );

    await mkdir(outputDirectory, {
      recursive: true
    });

    const engineResult = await engine.render({
      inputFilePaths,
      outputDirectory,
      outputBaseName: jobId,
      preset: runningJob.preset,
      outputFormat: outputFormatForJob(runningJob)
    });
    const safeEngineResult = sanitizeEngineResult(engineResult, deps);

    if (!safeEngineResult.success) {
      const failed = await deps.markHdrJobFailed(jobId, {
        errorMessage: safeEngineResult.error ?? "hdr_engine_failed",
        commandRedacted: safeEngineResult.commandRedacted
      });
      return failed
        ? {
            hdrJob: failed,
            exports: await deps.listExportsForJob(jobId),
            engineResult: safeEngineResult
          }
        : null;
    }

    const exports =
      runningJob.engineMode === "fake"
        ? await createFakeExports({
            job: runningJob,
            group,
            engineResult: safeEngineResult,
            deps
          })
        : await createPhotomatixExports({
            job: runningJob,
            engineResult: safeEngineResult,
            deps
          });
    const succeeded = await deps.markHdrJobSucceeded(jobId, {
      commandRedacted: safeEngineResult.commandRedacted
    });

    return succeeded
      ? {
          hdrJob: succeeded,
          exports,
          engineResult: safeEngineResult
        }
      : null;
  } catch (error) {
    const failed = await deps.markHdrJobFailed(jobId, {
      errorMessage: safeJobError(error)
    });

    return failed
      ? {
          hdrJob: failed,
          exports: await deps.listExportsForJob(jobId),
          engineResult: null
        }
      : null;
  }
}
