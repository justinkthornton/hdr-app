import { randomUUID } from "node:crypto";
import type { HdrEngineMode, HdrExport, HdrJob } from "../domain/hdr";
import type { ExportKind, JobStatus } from "../domain/status";
import type { Queryable } from "./pool";

type HdrJobRow = {
  id: string;
  shoot_id: string;
  bracket_group_id: string;
  status: JobStatus;
  engine_mode: HdrEngineMode;
  preset: string;
  output_mls_jpeg: boolean;
  output_full_jpeg: boolean;
  output_tiff: boolean;
  started_at: Date | string | null;
  finished_at: Date | string | null;
  error_message: string | null;
  command_redacted: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ExportRow = {
  id: string;
  shoot_id: string;
  hdr_job_id: string;
  kind: ExportKind;
  storage_key: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  file_size_bytes: string | number | null;
  created_at: Date | string;
};

const hdrJobFields = `
  id,
  shoot_id,
  bracket_group_id,
  status,
  engine_mode,
  preset,
  output_mls_jpeg,
  output_full_jpeg,
  output_tiff,
  started_at,
  finished_at,
  error_message,
  command_redacted,
  created_at,
  updated_at
`;

const exportFields = `
  id,
  shoot_id,
  hdr_job_id,
  kind,
  storage_key,
  mime_type,
  width,
  height,
  file_size_bytes,
  created_at
`;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toNullableDate(value: Date | string | null): Date | null {
  return value ? toDate(value) : null;
}

function mapHdrJob(row: HdrJobRow): HdrJob {
  return {
    id: row.id,
    shootId: row.shoot_id,
    bracketGroupId: row.bracket_group_id,
    status: row.status,
    engineMode: row.engine_mode,
    preset: row.preset,
    outputMlsJpeg: row.output_mls_jpeg,
    outputFullJpeg: row.output_full_jpeg,
    outputTiff: row.output_tiff,
    startedAt: toNullableDate(row.started_at),
    finishedAt: toNullableDate(row.finished_at),
    errorMessage: row.error_message,
    commandRedacted: row.command_redacted,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at)
  };
}

function mapExport(row: ExportRow): HdrExport {
  return {
    id: row.id,
    shootId: row.shoot_id,
    hdrJobId: row.hdr_job_id,
    kind: row.kind,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    fileSizeBytes:
      row.file_size_bytes === null
        ? null
        : typeof row.file_size_bytes === "number"
          ? row.file_size_bytes
          : Number(row.file_size_bytes),
    createdAt: toDate(row.created_at)
  };
}

export async function createHdrJob(
  db: Queryable,
  input: {
    shootId: string;
    bracketGroupId: string;
    preset?: string;
    engineMode?: HdrEngineMode;
    outputMlsJpeg?: boolean;
    outputFullJpeg?: boolean;
    outputTiff?: boolean;
  }
): Promise<HdrJob> {
  const result = await db.query<HdrJobRow>(
    `insert into hdr_jobs (
      id,
      shoot_id,
      bracket_group_id,
      status,
      engine_mode,
      preset,
      output_mls_jpeg,
      output_full_jpeg,
      output_tiff
    ) values ($1, $2, $3, 'queued', $4, $5, $6, $7, $8)
    returning ${hdrJobFields}`,
    [
      randomUUID(),
      input.shootId,
      input.bracketGroupId,
      input.engineMode ?? "fake",
      input.preset ?? "Natural",
      input.outputMlsJpeg ?? true,
      input.outputFullJpeg ?? true,
      input.outputTiff ?? false
    ]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Failed to create HDR job");
  }

  return mapHdrJob(row);
}

export async function getHdrJob(db: Queryable, jobId: string): Promise<HdrJob | null> {
  const result = await db.query<HdrJobRow>(
    `select ${hdrJobFields}
    from hdr_jobs
    where id = $1`,
    [jobId]
  );

  const row = result.rows[0];
  return row ? mapHdrJob(row) : null;
}

export async function listHdrJobsForShoot(db: Queryable, shootId: string): Promise<HdrJob[]> {
  const result = await db.query<HdrJobRow>(
    `select ${hdrJobFields}
    from hdr_jobs
    where shoot_id = $1
    order by created_at desc`,
    [shootId]
  );

  return result.rows.map(mapHdrJob);
}

export async function listHdrJobsForBracketGroup(
  db: Queryable,
  bracketGroupId: string
): Promise<HdrJob[]> {
  const result = await db.query<HdrJobRow>(
    `select ${hdrJobFields}
    from hdr_jobs
    where bracket_group_id = $1
    order by created_at desc`,
    [bracketGroupId]
  );

  return result.rows.map(mapHdrJob);
}

export async function updateHdrJobStatus(
  db: Queryable,
  jobId: string,
  status: JobStatus
): Promise<HdrJob | null> {
  const result = await db.query<HdrJobRow>(
    `update hdr_jobs
    set
      status = $2,
      updated_at = now()
    where id = $1
    returning ${hdrJobFields}`,
    [jobId, status]
  );

  const row = result.rows[0];
  return row ? mapHdrJob(row) : null;
}

export async function markHdrJobRunning(db: Queryable, jobId: string): Promise<HdrJob | null> {
  const result = await db.query<HdrJobRow>(
    `update hdr_jobs
    set
      status = 'running',
      started_at = coalesce(started_at, now()),
      finished_at = null,
      error_message = null,
      updated_at = now()
    where id = $1
    returning ${hdrJobFields}`,
    [jobId]
  );

  const row = result.rows[0];
  return row ? mapHdrJob(row) : null;
}

export async function markHdrJobSucceeded(
  db: Queryable,
  jobId: string,
  input: {
    commandRedacted: string | null;
  }
): Promise<HdrJob | null> {
  const result = await db.query<HdrJobRow>(
    `update hdr_jobs
    set
      status = 'succeeded',
      finished_at = now(),
      error_message = null,
      command_redacted = $2,
      updated_at = now()
    where id = $1
    returning ${hdrJobFields}`,
    [jobId, input.commandRedacted]
  );

  const row = result.rows[0];
  return row ? mapHdrJob(row) : null;
}

export async function markHdrJobFailed(
  db: Queryable,
  jobId: string,
  input: {
    errorMessage: string;
    commandRedacted?: string | null;
  }
): Promise<HdrJob | null> {
  const result = await db.query<HdrJobRow>(
    `update hdr_jobs
    set
      status = 'failed',
      finished_at = now(),
      error_message = $2,
      command_redacted = $3,
      updated_at = now()
    where id = $1
    returning ${hdrJobFields}`,
    [jobId, input.errorMessage, input.commandRedacted ?? null]
  );

  const row = result.rows[0];
  return row ? mapHdrJob(row) : null;
}

export async function createExport(
  db: Queryable,
  input: {
    shootId: string;
    hdrJobId: string;
    kind: ExportKind;
    storageKey: string;
    mimeType: string;
    width?: number | null;
    height?: number | null;
    fileSizeBytes?: number | null;
  }
): Promise<HdrExport> {
  const result = await db.query<ExportRow>(
    `insert into exports (
      id,
      shoot_id,
      hdr_job_id,
      kind,
      storage_key,
      mime_type,
      width,
      height,
      file_size_bytes
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    returning ${exportFields}`,
    [
      randomUUID(),
      input.shootId,
      input.hdrJobId,
      input.kind,
      input.storageKey,
      input.mimeType,
      input.width ?? null,
      input.height ?? null,
      input.fileSizeBytes ?? null
    ]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Failed to create export");
  }

  return mapExport(row);
}

export async function listExportsForJob(db: Queryable, jobId: string): Promise<HdrExport[]> {
  const result = await db.query<ExportRow>(
    `select ${exportFields}
    from exports
    where hdr_job_id = $1
    order by created_at asc`,
    [jobId]
  );

  return result.rows.map(mapExport);
}

export async function listExportsForShoot(db: Queryable, shootId: string): Promise<HdrExport[]> {
  const result = await db.query<ExportRow>(
    `select ${exportFields}
    from exports
    where shoot_id = $1
    order by created_at desc`,
    [shootId]
  );

  return result.rows.map(mapExport);
}

export async function getExport(db: Queryable, exportId: string): Promise<HdrExport | null> {
  const result = await db.query<ExportRow>(
    `select ${exportFields}
    from exports
    where id = $1`,
    [exportId]
  );

  const row = result.rows[0];
  return row ? mapExport(row) : null;
}
