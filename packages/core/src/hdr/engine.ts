import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

export type HdrOutputFormat = "jpg" | "tif";

export type HdrRenderRequest = {
  inputFilePaths: string[];
  outputDirectory: string;
  outputBaseName?: string;
  preset?: string;
  outputFormat?: HdrOutputFormat;
  timeoutMs?: number;
};

export type HdrRenderResult = {
  engine: "fake" | "photomatix-cli";
  success: boolean;
  exitCode: number | null;
  timedOut: boolean;
  commandRedacted: string;
  stdoutRedacted: string;
  stderrRedacted: string;
  outputPaths: string[];
  error: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type CommandInvocation = {
  executablePath: string;
  args: string[];
  timeoutMs: number;
  secretValues?: string[];
};

export type CommandRunResult = {
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  error?: string;
};

export type PhotomatixCliEngineOptions = {
  executablePath: string;
  licenseKey?: string;
  defaultTimeoutMs?: number;
  runCommand?: (input: CommandInvocation) => Promise<CommandRunResult>;
  checkExecutable?: (executablePath: string) => Promise<boolean>;
};

export interface HdrEngine {
  render(request: HdrRenderRequest): Promise<HdrRenderResult>;
}

const defaultPreset = "Natural";
const defaultOutputFormat = "jpg";
const defaultOutputBaseName = "hdr-output";
const defaultTimeoutMs = 60_000;

function quoteArg(value: string): string {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function redactSecrets(value: string, secretValues: string[] = []): string {
  return secretValues.reduce((redacted, secretValue) => {
    if (!secretValue) {
      return redacted;
    }

    return redacted.split(secretValue).join("[REDACTED]");
  }, value);
}

export function buildRedactedCommand(
  executablePath: string,
  args: string[],
  secretValues: string[] = []
): string {
  return [executablePath, ...args]
    .map((part) => quoteArg(redactSecrets(part, secretValues)))
    .join(" ");
}

function outputPathForRequest(request: HdrRenderRequest): string {
  const outputFormat = request.outputFormat ?? defaultOutputFormat;
  const outputBaseName = request.outputBaseName ?? defaultOutputBaseName;

  return path.join(request.outputDirectory, `${outputBaseName}.${outputFormat}`);
}

function outputStemForRequest(request: HdrRenderRequest): string {
  const outputBaseName = request.outputBaseName ?? defaultOutputBaseName;

  return path.join(request.outputDirectory, outputBaseName);
}

function photomatixArgsForRequest(request: HdrRenderRequest): string[] {
  const preset = request.preset ?? defaultPreset;
  const outputFormat = request.outputFormat ?? defaultOutputFormat;

  return [
    "-a2",
    "-x",
    preset,
    "-h",
    "remove",
    "-s",
    outputFormat,
    "-o",
    outputStemForRequest(request),
    ...request.inputFilePaths
  ];
}

async function defaultCheckExecutable(executablePath: string): Promise<boolean> {
  await access(executablePath, constants.X_OK);
  return true;
}

function defaultRunCommand(input: CommandInvocation): Promise<CommandRunResult> {
  return new Promise((resolve) => {
    const child = spawn(input.executablePath, input.args, {
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let settled = false;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, input.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve({
        exitCode: null,
        timedOut,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        error: error.message
      });
    });
    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve({
        exitCode,
        timedOut,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8")
      });
    });
  });
}

function commandRunToResult(input: {
  engine: HdrRenderResult["engine"];
  commandRedacted: string;
  outputPaths: string[];
  runResult: CommandRunResult;
  error: string | null;
  metadata: HdrRenderResult["metadata"];
  secretValues?: string[];
}): HdrRenderResult {
  const secretValues = input.secretValues ?? [];
  const success = input.runResult.exitCode === 0 && !input.runResult.timedOut && !input.error;

  return {
    engine: input.engine,
    success,
    exitCode: input.runResult.exitCode,
    timedOut: input.runResult.timedOut,
    commandRedacted: input.commandRedacted,
    stdoutRedacted: redactSecrets(input.runResult.stdout, secretValues),
    stderrRedacted: redactSecrets(input.runResult.stderr, secretValues),
    outputPaths: input.outputPaths,
    error:
      input.error ??
      input.runResult.error ??
      (success ? null : input.runResult.timedOut ? "photomatixcl_timeout" : "photomatixcl_failed"),
    metadata: input.metadata
  };
}

export class FakeHdrEngine implements HdrEngine {
  async render(request: HdrRenderRequest): Promise<HdrRenderResult> {
    const outputPath = outputPathForRequest(request);
    const args = [
      "--preset",
      request.preset ?? defaultPreset,
      "--format",
      request.outputFormat ?? defaultOutputFormat,
      "--output",
      outputPath,
      ...request.inputFilePaths
    ];

    return {
      engine: "fake",
      success: true,
      exitCode: 0,
      timedOut: false,
      commandRedacted: buildRedactedCommand("fake-hdr-engine", args),
      stdoutRedacted: "Fake HDR render completed.",
      stderrRedacted: "",
      outputPaths: [outputPath],
      error: null,
      metadata: {
        inputCount: request.inputFilePaths.length,
        preset: request.preset ?? defaultPreset,
        outputFormat: request.outputFormat ?? defaultOutputFormat,
        smokeOnly: true
      }
    };
  }
}

export class PhotomatixCliEngine implements HdrEngine {
  private readonly defaultTimeoutMs: number;
  private readonly runCommand: (input: CommandInvocation) => Promise<CommandRunResult>;
  private readonly checkExecutable: (executablePath: string) => Promise<boolean>;

  constructor(private readonly options: PhotomatixCliEngineOptions) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? defaultTimeoutMs;
    this.runCommand = options.runCommand ?? defaultRunCommand;
    this.checkExecutable = options.checkExecutable ?? defaultCheckExecutable;
  }

  async checkStartup(timeoutMs = 10_000): Promise<HdrRenderResult> {
    const executableError = await this.executableError();

    if (executableError) {
      return executableError;
    }

    const secretValues = this.secretValues();
    const args: string[] = [];
    const commandRedacted = buildRedactedCommand(this.options.executablePath, args, secretValues);
    const runResult = await this.runCommand({
      executablePath: this.options.executablePath,
      args,
      timeoutMs,
      secretValues
    });

    return commandRunToResult({
      engine: "photomatix-cli",
      commandRedacted,
      outputPaths: [],
      runResult,
      error: runResult.timedOut ? "photomatixcl_startup_timeout" : null,
      metadata: {
        stage: "startup",
        startupOnly: true
      },
      secretValues
    });
  }

  async render(request: HdrRenderRequest): Promise<HdrRenderResult> {
    const executableError = await this.executableError();

    if (executableError) {
      return executableError;
    }

    if (request.inputFilePaths.length === 0) {
      return {
        engine: "photomatix-cli",
        success: false,
        exitCode: null,
        timedOut: false,
        commandRedacted: buildRedactedCommand(this.options.executablePath, []),
        stdoutRedacted: "",
        stderrRedacted: "",
        outputPaths: [],
        error: "photomatixcl_no_input_files",
        metadata: {
          stage: "validation"
        }
      };
    }

    const secretValues = this.secretValues();
    const licenseResult = await this.loadLicenseIfPresent(
      request.timeoutMs ?? this.defaultTimeoutMs
    );

    if (licenseResult && !licenseResult.success) {
      return licenseResult;
    }

    const args = photomatixArgsForRequest(request);
    const commandRedacted = buildRedactedCommand(this.options.executablePath, args, secretValues);
    const runResult = await this.runCommand({
      executablePath: this.options.executablePath,
      args,
      timeoutMs: request.timeoutMs ?? this.defaultTimeoutMs,
      secretValues
    });

    return commandRunToResult({
      engine: "photomatix-cli",
      commandRedacted,
      outputPaths: [outputPathForRequest(request)],
      runResult,
      error: null,
      metadata: {
        stage: "render",
        inputCount: request.inputFilePaths.length,
        preset: request.preset ?? defaultPreset,
        outputFormat: request.outputFormat ?? defaultOutputFormat
      },
      secretValues
    });
  }

  private secretValues(): string[] {
    return this.options.licenseKey ? [this.options.licenseKey] : [];
  }

  private async executableError(): Promise<HdrRenderResult | null> {
    const executablePath = this.options.executablePath;

    if (!executablePath) {
      return this.missingExecutableResult("<missing>");
    }

    const isExecutable = await this.checkExecutable(executablePath).catch(() => false);

    return isExecutable ? null : this.missingExecutableResult(executablePath);
  }

  private missingExecutableResult(executablePath: string): HdrRenderResult {
    return {
      engine: "photomatix-cli",
      success: false,
      exitCode: null,
      timedOut: false,
      commandRedacted: buildRedactedCommand(executablePath, []),
      stdoutRedacted: "",
      stderrRedacted: "",
      outputPaths: [],
      error: "photomatixcl_missing_or_not_executable",
      metadata: {
        stage: "startup"
      }
    };
  }

  private async loadLicenseIfPresent(timeoutMs: number): Promise<HdrRenderResult | null> {
    if (!this.options.licenseKey) {
      return null;
    }

    const secretValues = this.secretValues();
    const args = ["-ll", this.options.licenseKey];
    const commandRedacted = buildRedactedCommand(this.options.executablePath, args, secretValues);
    const runResult = await this.runCommand({
      executablePath: this.options.executablePath,
      args,
      timeoutMs,
      secretValues
    });

    if (runResult.exitCode === 0 && !runResult.timedOut) {
      return null;
    }

    return commandRunToResult({
      engine: "photomatix-cli",
      commandRedacted,
      outputPaths: [],
      runResult,
      error: runResult.timedOut ? "photomatixcl_license_timeout" : "photomatixcl_license_failed",
      metadata: {
        stage: "license"
      },
      secretValues
    });
  }
}
