import { accessSync, constants, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  FakeHdrEngine,
  PhotomatixCliEngine,
  type HdrRenderResult,
  type PhotomatixCliEngineOptions
} from "../../core/src/hdr";

export type WorkerSmokeStatus = "passed" | "blocked" | "failed" | "skipped";

export type WorkerSmokeStageName = "binary" | "startup" | "license" | "fixture" | "render";

export type WorkerSmokeStage = {
  name: WorkerSmokeStageName;
  status: WorkerSmokeStatus;
  message: string;
  error?: string | null;
  commandRedacted?: string | null;
  outputPaths?: string[];
};

export type WorkerSmokeResult = {
  mode: "fake" | "photomatix";
  status: WorkerSmokeStatus;
  message: string;
  engineResult: HdrRenderResult | null;
  stages?: WorkerSmokeStage[];
  fixtureStatus?: "present" | "absent";
  fixtureDirectory?: string;
  outputDirectory?: string;
  outputPaths?: string[];
  setupHint?: string;
};

export type PhotomatixWorkerSmokeDeps = {
  checkExecutable?: (executablePath: string) => Promise<boolean>;
  runCommand?: PhotomatixCliEngineOptions["runCommand"];
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

function replaceAll(value: string, search: string | undefined, replacement: string): string {
  return search && search.length > 0 ? value.split(search).join(replacement) : value;
}

function redactSmokeValue(value: string, env: NodeJS.ProcessEnv): string {
  let redacted = value;
  redacted = replaceAll(redacted, env.PHOTOMATIX_LICENSE_KEY, "[REDACTED]");
  redacted = replaceAll(redacted, env.PHOTOMATIXCL_PATH, "[PHOTOMATIXCL_PATH]");
  redacted = replaceAll(
    redacted,
    env.PHOTOMATIX_SMOKE_FIXTURE_DIR,
    "[PHOTOMATIX_SMOKE_FIXTURE_DIR]"
  );
  redacted = replaceAll(redacted, env.LOCAL_STORAGE_ROOT, "[LOCAL_STORAGE_ROOT]");
  redacted = replaceAll(redacted, env.PHOTOMATIX_SMOKE_OUTPUT_DIR, "[PHOTOMATIX_SMOKE_OUTPUT_DIR]");
  redacted = replaceAll(redacted, process.cwd(), "[PROJECT_ROOT]");
  redacted = replaceAll(redacted, env.HOME, "[HOME]");

  return redacted;
}

function redactOutputPaths(outputPaths: string[], env: NodeJS.ProcessEnv): string[] {
  return outputPaths.map((outputPath) => redactSmokeValue(outputPath, env));
}

function sanitizeEngineResult(result: HdrRenderResult, env: NodeJS.ProcessEnv): HdrRenderResult {
  return {
    ...result,
    commandRedacted: redactSmokeValue(result.commandRedacted, env),
    stdoutRedacted: redactSmokeValue(result.stdoutRedacted, env),
    stderrRedacted: redactSmokeValue(result.stderrRedacted, env),
    outputPaths: redactOutputPaths(result.outputPaths, env)
  };
}

async function defaultSmokeCheckExecutable(executablePath: string): Promise<boolean> {
  try {
    accessSync(executablePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function stageFromEngineResult(
  name: WorkerSmokeStageName,
  result: HdrRenderResult,
  env: NodeJS.ProcessEnv,
  options: {
    successMessage: string;
    failureMessage: string;
    skippedMessage?: string;
  }
): WorkerSmokeStage {
  const sanitized = sanitizeEngineResult(result, env);
  const skipped = sanitized.metadata.skipped === true;

  return {
    name,
    status: skipped ? "skipped" : sanitized.success ? "passed" : "failed",
    message: skipped
      ? (options.skippedMessage ?? options.successMessage)
      : sanitized.success
        ? options.successMessage
        : options.failureMessage,
    error: sanitized.error,
    commandRedacted: sanitized.commandRedacted,
    outputPaths: sanitized.outputPaths
  };
}

function resultStatusFromStages(stages: WorkerSmokeStage[]): WorkerSmokeStatus {
  const renderStage = stages.find((stage) => stage.name === "render");

  if (renderStage?.status === "passed") {
    return "passed";
  }

  if (renderStage?.status === "failed") {
    return "failed";
  }

  if (stages.some((stage) => stage.name === "license" && stage.status === "failed")) {
    return "failed";
  }

  if (
    stages.some(
      (stage) => (stage.name === "binary" || stage.name === "fixture") && stage.status === "blocked"
    )
  ) {
    return "blocked";
  }

  if (stages.some((stage) => stage.status === "failed")) {
    return "failed";
  }

  return "skipped";
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
  env: NodeJS.ProcessEnv = process.env,
  deps: PhotomatixWorkerSmokeDeps = {}
): Promise<WorkerSmokeResult> {
  const executablePath = env.PHOTOMATIXCL_PATH;
  const stages: WorkerSmokeStage[] = [];

  if (!executablePath) {
    stages.push({
      name: "binary",
      status: "blocked",
      message: "PHOTOMATIXCL_PATH is not set.",
      error: "photomatixcl_path_missing"
    });

    return {
      mode: "photomatix",
      status: "blocked",
      message: "PHOTOMATIXCL_PATH is not set, so real PhotomatixCL smoke is manual/blocked.",
      engineResult: null,
      stages,
      setupHint: "Set PHOTOMATIXCL_PATH to a mounted Linux ARM PhotomatixCL binary."
    };
  }

  const fixtureDirectory = env.PHOTOMATIX_SMOKE_FIXTURE_DIR ?? defaultFixtureDirectory;
  const outputDirectory = defaultSmokeOutputDirectory(env);
  const files = fixtureFiles(fixtureDirectory);
  const checkExecutable = deps.checkExecutable ?? defaultSmokeCheckExecutable;
  const binaryExecutable = await checkExecutable(executablePath);

  stages.push({
    name: "binary",
    status: binaryExecutable ? "passed" : "blocked",
    message: binaryExecutable
      ? "PhotomatixCL binary exists and is executable."
      : "PhotomatixCL binary was not found or is not executable.",
    error: binaryExecutable ? null : "photomatixcl_missing_or_not_executable",
    commandRedacted: redactSmokeValue(executablePath, env)
  });

  if (!binaryExecutable) {
    return {
      mode: "photomatix",
      status: "blocked",
      message: "PhotomatixCL binary was not found or executable.",
      engineResult: null,
      stages,
      fixtureStatus: files.length >= 3 ? "present" : "absent",
      fixtureDirectory: redactSmokeValue(fixtureDirectory, env),
      outputDirectory: redactSmokeValue(outputDirectory, env),
      setupHint: "Mount the Linux ARM PhotomatixCL binary at /opt/photomatixcl-local/PhotomatixCL."
    };
  }

  const engineOptions: PhotomatixCliEngineOptions = {
    executablePath,
    defaultTimeoutMs: Number(env.PHOTOMATIX_TIMEOUT_MS ?? 60_000),
    checkExecutable
  };

  if (env.PHOTOMATIX_LICENSE_KEY) {
    engineOptions.licenseKey = env.PHOTOMATIX_LICENSE_KEY;
  }

  if (deps.runCommand) {
    engineOptions.runCommand = deps.runCommand;
  }

  const engine = new PhotomatixCliEngine(engineOptions);
  const startupResult = sanitizeEngineResult(
    await engine.checkStartup(Number(env.PHOTOMATIX_STARTUP_TIMEOUT_MS ?? 10_000)),
    env
  );

  stages.push(
    stageFromEngineResult("startup", startupResult, env, {
      successMessage: "PhotomatixCL startup command completed.",
      failureMessage:
        "PhotomatixCL startup command failed; fixture render remains the real validation."
    })
  );

  if (env.PHOTOMATIX_LICENSE_KEY) {
    const licenseResult = sanitizeEngineResult(
      await engine.checkLicense(Number(env.PHOTOMATIX_TIMEOUT_MS ?? 60_000)),
      env
    );
    stages.push(
      stageFromEngineResult("license", licenseResult, env, {
        successMessage: "PhotomatixCL license load completed.",
        failureMessage: "PhotomatixCL license load failed."
      })
    );

    if (!licenseResult.success) {
      return {
        mode: "photomatix",
        status: "failed",
        message: "PhotomatixCL license load failed.",
        engineResult: licenseResult,
        stages,
        fixtureStatus: files.length >= 3 ? "present" : "absent",
        fixtureDirectory: redactSmokeValue(fixtureDirectory, env),
        outputDirectory: redactSmokeValue(outputDirectory, env)
      };
    }
  } else {
    stages.push({
      name: "license",
      status: "skipped",
      message: "No PHOTOMATIX_LICENSE_KEY set; using trial mode.",
      error: null
    });
  }

  stages.push({
    name: "fixture",
    status: files.length >= 3 ? "passed" : "blocked",
    message:
      files.length >= 3
        ? `Found ${files.length} JPEG fixture file(s).`
        : "At least three JPEG fixtures are required for real Photomatix render smoke.",
    error: files.length >= 3 ? null : "photomatix_fixture_missing"
  });

  if (files.length < 3) {
    return {
      mode: "photomatix",
      status: resultStatusFromStages(stages),
      message: "PhotomatixCL binary was checked; bracket processing is fixture-pending.",
      engineResult: startupResult,
      stages,
      fixtureStatus: "absent",
      fixtureDirectory: redactSmokeValue(fixtureDirectory, env),
      outputDirectory: redactSmokeValue(outputDirectory, env),
      setupHint: "Add at least three non-client JPEGs to the local Phase 2B fixture directory."
    };
  }

  mkdirSync(outputDirectory, {
    recursive: true
  });

  const renderResult = await engine.render({
    inputFilePaths: files,
    outputDirectory,
    outputBaseName: "phase-2b-photomatix-smoke",
    preset: env.PHOTOMATIX_PRESET ?? "Natural",
    outputFormat: "jpg",
    timeoutMs: Number(env.PHOTOMATIX_TIMEOUT_MS ?? 60_000)
  });
  const sanitizedRenderResult = sanitizeEngineResult(renderResult, env);

  stages.push(
    stageFromEngineResult("render", sanitizedRenderResult, env, {
      successMessage: "PhotomatixCL bracket render completed.",
      failureMessage: "PhotomatixCL bracket render failed."
    })
  );
  const status = resultStatusFromStages(stages);

  return {
    mode: "photomatix",
    status,
    message: sanitizedRenderResult.success
      ? "PhotomatixCL bracket smoke passed."
      : "PhotomatixCL bracket smoke failed.",
    engineResult: sanitizedRenderResult,
    stages,
    fixtureStatus: "present",
    fixtureDirectory: redactSmokeValue(fixtureDirectory, env),
    outputDirectory: redactSmokeValue(outputDirectory, env),
    outputPaths: sanitizedRenderResult.outputPaths
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
