import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  FakeHdrEngine,
  PhotomatixCliEngine,
  type HdrRenderResult,
  type PhotomatixCliEngineOptions
} from "../../core/src/hdr";

export type WorkerSmokeStatus = "passed" | "blocked" | "failed" | "skipped";

export type WorkerSmokeResult = {
  mode: "fake" | "photomatix";
  status: WorkerSmokeStatus;
  message: string;
  engineResult: HdrRenderResult | null;
  fixtureStatus?: "present" | "absent";
  fixtureDirectory?: string;
  setupHint?: string;
};

const defaultFixtureDirectory = "local-fixtures/phase-2b/photomatix-smoke/3-shot-jpeg";

function fixtureFiles(fixtureDirectory: string): string[] {
  if (!existsSync(fixtureDirectory)) {
    return [];
  }

  return readdirSync(fixtureDirectory)
    .map((filename) => path.join(fixtureDirectory, filename))
    .filter((filePath) => {
      if (!statSync(filePath).isFile()) {
        return false;
      }

      return /\.(jpe?g)$/i.test(filePath);
    })
    .sort();
}

function defaultSmokeOutputDirectory(env: NodeJS.ProcessEnv): string {
  if (env.PHOTOMATIX_SMOKE_OUTPUT_DIR) {
    return env.PHOTOMATIX_SMOKE_OUTPUT_DIR;
  }

  if (env.LOCAL_STORAGE_ROOT) {
    return path.join(env.LOCAL_STORAGE_ROOT, "phase-2b-photomatix-smoke");
  }

  return "/tmp/hdr-worker-smoke-output";
}

export async function runFakeWorkerSmoke(): Promise<WorkerSmokeResult> {
  const engine = new FakeHdrEngine();
  const engineResult = await engine.render({
    inputFilePaths: [
      "/tmp/fake-bracket/a.jpg",
      "/tmp/fake-bracket/b.jpg",
      "/tmp/fake-bracket/c.jpg"
    ],
    outputDirectory: "/tmp/hdr-worker-fake-smoke",
    outputBaseName: "fake-smoke",
    preset: "Phase2BSmoke",
    outputFormat: "jpg",
    timeoutMs: 1_000
  });

  return {
    mode: "fake",
    status: engineResult.success ? "passed" : "failed",
    message: engineResult.success
      ? "Fake HDR worker smoke passed."
      : "Fake HDR worker smoke failed.",
    engineResult
  };
}

export async function runPhotomatixWorkerSmoke(
  env: NodeJS.ProcessEnv = process.env
): Promise<WorkerSmokeResult> {
  const executablePath = env.PHOTOMATIXCL_PATH;

  if (!executablePath) {
    return {
      mode: "photomatix",
      status: "blocked",
      message: "PHOTOMATIXCL_PATH is not set, so real PhotomatixCL smoke is manual/blocked.",
      engineResult: null,
      setupHint: "Set PHOTOMATIXCL_PATH to a mounted Linux ARM PhotomatixCL binary."
    };
  }

  const fixtureDirectory = env.PHOTOMATIX_SMOKE_FIXTURE_DIR ?? defaultFixtureDirectory;
  const files = fixtureFiles(fixtureDirectory);
  const engineOptions: PhotomatixCliEngineOptions = {
    executablePath,
    defaultTimeoutMs: Number(env.PHOTOMATIX_TIMEOUT_MS ?? 60_000)
  };

  if (env.PHOTOMATIX_LICENSE_KEY) {
    engineOptions.licenseKey = env.PHOTOMATIX_LICENSE_KEY;
  }

  const engine = new PhotomatixCliEngine(engineOptions);

  if (files.length < 3) {
    const startupResult = await engine.checkStartup(
      Number(env.PHOTOMATIX_STARTUP_TIMEOUT_MS ?? 10_000)
    );

    return {
      mode: "photomatix",
      status:
        startupResult.error === "photomatixcl_missing_or_not_executable" ? "blocked" : "skipped",
      message:
        startupResult.error === "photomatixcl_missing_or_not_executable"
          ? "PhotomatixCL binary was not found or executable."
          : "PhotomatixCL startup was checked; bracket processing is fixture-pending.",
      engineResult: startupResult,
      fixtureStatus: "absent",
      fixtureDirectory,
      setupHint: "Add at least three non-client JPEGs to the local Phase 2B fixture directory."
    };
  }

  const renderResult = await engine.render({
    inputFilePaths: files,
    outputDirectory: defaultSmokeOutputDirectory(env),
    outputBaseName: "phase-2b-photomatix-smoke",
    preset: env.PHOTOMATIX_PRESET ?? "Natural",
    outputFormat: "jpg",
    timeoutMs: Number(env.PHOTOMATIX_TIMEOUT_MS ?? 60_000)
  });

  return {
    mode: "photomatix",
    status: renderResult.success ? "passed" : "failed",
    message: renderResult.success
      ? "PhotomatixCL bracket smoke passed."
      : "PhotomatixCL bracket smoke failed.",
    engineResult: renderResult,
    fixtureStatus: "present",
    fixtureDirectory
  };
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? "fake";
  const result =
    mode === "photomatix" ? await runPhotomatixWorkerSmoke() : await runFakeWorkerSmoke();

  console.log(JSON.stringify(result, null, 2));

  if (result.status === "failed" || result.status === "blocked") {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
