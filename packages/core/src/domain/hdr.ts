import type { ExportKind, JobStatus } from "./status";

export type HdrEngineMode = "fake" | "photomatix";

export type HdrJob = {
  id: string;
  shootId: string;
  bracketGroupId: string;
  status: JobStatus;
  engineMode: HdrEngineMode;
  preset: string;
  outputMlsJpeg: boolean;
  outputFullJpeg: boolean;
  outputTiff: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorMessage: string | null;
  commandRedacted: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HdrExport = {
  id: string;
  shootId: string;
  hdrJobId: string;
  kind: ExportKind;
  storageKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  createdAt: Date;
};
