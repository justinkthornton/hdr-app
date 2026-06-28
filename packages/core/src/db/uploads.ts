import { randomUUID } from "node:crypto";
import type {
  Asset,
  AssetMetadataFields,
  BracketGroup,
  BracketGroupAsset,
  UploadBatch
} from "../domain/uploads";
import type { BracketGroupStatus } from "../domain/status";
import type { CandidateBracketGroup } from "../brackets/grouping";
import type { Queryable } from "./pool";

type UploadBatchRow = {
  id: string;
  shoot_id: string;
  status: string;
  original_file_count: number;
  created_at: Date | string;
};

type AssetRow = {
  id: string;
  shoot_id: string;
  upload_batch_id: string | null;
  original_filename: string;
  storage_key: string;
  thumbnail_storage_key: string | null;
  mime_type: string;
  file_ext: string;
  file_size_bytes: string | number;
  width: number | null;
  height: number | null;
  camera_model: string | null;
  lens_model: string | null;
  captured_at: Date | string | null;
  exposure_time: string | null;
  aperture: string | null;
  iso: number | null;
  exposure_bias: string | null;
  raw_metadata: Record<string, unknown>;
  created_at: Date | string;
};

type BracketGroupRow = {
  id: string;
  shoot_id: string;
  upload_batch_id: string;
  status: BracketGroupStatus;
  group_index: number;
  expected_count: number;
  detected_count: number;
  confidence: string | number;
  grouping_reason: string | null;
  reviewed_at: Date | string | null;
  approved_at: Date | string | null;
  created_at: Date | string;
};

type BracketGroupAssetRow = AssetRow & {
  bracket_group_id: string;
  sort_order: number;
};

const uploadBatchFields = `
  id,
  shoot_id,
  status,
  original_file_count,
  created_at
`;

const assetFields = `
  id,
  shoot_id,
  upload_batch_id,
  original_filename,
  storage_key,
  thumbnail_storage_key,
  mime_type,
  file_ext,
  file_size_bytes,
  width,
  height,
  camera_model,
  lens_model,
  captured_at,
  exposure_time,
  aperture,
  iso,
  exposure_bias,
  raw_metadata,
  created_at
`;

const bracketGroupFields = `
  id,
  shoot_id,
  upload_batch_id,
  status,
  group_index,
  expected_count,
  detected_count,
  confidence,
  grouping_reason,
  reviewed_at,
  approved_at,
  created_at
`;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toNullableDate(value: Date | string | null): Date | null {
  return value ? toDate(value) : null;
}

function mapUploadBatch(row: UploadBatchRow): UploadBatch {
  return {
    id: row.id,
    shootId: row.shoot_id,
    status: row.status,
    originalFileCount: row.original_file_count,
    createdAt: toDate(row.created_at)
  };
}

export function mapAssetRow(row: AssetRow): Asset {
  return {
    id: row.id,
    shootId: row.shoot_id,
    uploadBatchId: row.upload_batch_id,
    originalFilename: row.original_filename,
    storageKey: row.storage_key,
    thumbnailStorageKey: row.thumbnail_storage_key,
    mimeType: row.mime_type,
    fileExt: row.file_ext,
    fileSizeBytes:
      typeof row.file_size_bytes === "number" ? row.file_size_bytes : Number(row.file_size_bytes),
    width: row.width,
    height: row.height,
    cameraModel: row.camera_model,
    lensModel: row.lens_model,
    capturedAt: toNullableDate(row.captured_at),
    exposureTime: row.exposure_time,
    aperture: row.aperture,
    iso: row.iso,
    exposureBias: row.exposure_bias,
    rawMetadata: row.raw_metadata,
    createdAt: toDate(row.created_at)
  };
}

function mapBracketGroup(row: BracketGroupRow, assets: BracketGroupAsset[] = []): BracketGroup {
  return {
    id: row.id,
    shootId: row.shoot_id,
    uploadBatchId: row.upload_batch_id,
    status: row.status,
    groupIndex: row.group_index,
    expectedCount: row.expected_count,
    detectedCount: row.detected_count,
    confidence: typeof row.confidence === "number" ? row.confidence : Number(row.confidence),
    groupingReason: row.grouping_reason,
    reviewedAt: toNullableDate(row.reviewed_at),
    approvedAt: toNullableDate(row.approved_at),
    createdAt: toDate(row.created_at),
    assets
  };
}

function mapBracketGroupAssetRow(row: BracketGroupAssetRow): BracketGroupAsset {
  return {
    ...mapAssetRow(row),
    sortOrder: row.sort_order
  };
}

async function attachAssetsToGroups(
  db: Queryable,
  groups: BracketGroupRow[]
): Promise<BracketGroup[]> {
  if (groups.length === 0) {
    return [];
  }

  const groupIds = groups.map((group) => group.id);
  const assetsResult = await db.query<BracketGroupAssetRow>(
    `select
      bga.bracket_group_id,
      bga.sort_order,
      ${assetFields
        .split(",")
        .map((field) => `a.${field.trim()}`)
        .join(",\n      ")}
    from bracket_group_assets bga
    join assets a on a.id = bga.asset_id
    where bga.bracket_group_id = any($1)
    order by bga.bracket_group_id, bga.sort_order asc`,
    [groupIds]
  );
  const assetsByGroup = new Map<string, BracketGroupAsset[]>();

  for (const asset of assetsResult.rows) {
    assetsByGroup.set(asset.bracket_group_id, [
      ...(assetsByGroup.get(asset.bracket_group_id) ?? []),
      mapBracketGroupAssetRow(asset)
    ]);
  }

  return groups.map((group) => mapBracketGroup(group, assetsByGroup.get(group.id) ?? []));
}

export async function createUploadBatch(
  db: Queryable,
  input: {
    shootId: string;
    originalFileCount: number;
    status?: string;
  }
): Promise<UploadBatch> {
  const result = await db.query<UploadBatchRow>(
    `insert into upload_batches (
      id,
      shoot_id,
      status,
      original_file_count
    ) values ($1, $2, $3, $4)
    returning ${uploadBatchFields}`,
    [randomUUID(), input.shootId, input.status ?? "uploaded", input.originalFileCount]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Failed to create upload batch");
  }

  return mapUploadBatch(row);
}

export async function createAsset(
  db: Queryable,
  input: {
    id?: string;
    shootId: string;
    uploadBatchId: string;
    originalFilename: string;
    storageKey: string;
    thumbnailStorageKey?: string | null;
    mimeType: string;
    fileExt: string;
    fileSizeBytes: number;
    metadata: AssetMetadataFields;
  }
): Promise<Asset> {
  const result = await db.query<AssetRow>(
    `insert into assets (
      id,
      shoot_id,
      upload_batch_id,
      original_filename,
      storage_key,
      thumbnail_storage_key,
      mime_type,
      file_ext,
      file_size_bytes,
      width,
      height,
      camera_model,
      lens_model,
      captured_at,
      exposure_time,
      aperture,
      iso,
      exposure_bias,
      raw_metadata
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19
    )
    returning ${assetFields}`,
    [
      input.id ?? randomUUID(),
      input.shootId,
      input.uploadBatchId,
      input.originalFilename,
      input.storageKey,
      input.thumbnailStorageKey ?? null,
      input.mimeType,
      input.fileExt,
      input.fileSizeBytes,
      input.metadata.width,
      input.metadata.height,
      input.metadata.cameraModel,
      input.metadata.lensModel,
      input.metadata.capturedAt,
      input.metadata.exposureTime,
      input.metadata.aperture,
      input.metadata.iso,
      input.metadata.exposureBias,
      input.metadata.rawMetadata
    ]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Failed to create asset");
  }

  return mapAssetRow(row);
}

export async function listAssetsForShoot(db: Queryable, shootId: string): Promise<Asset[]> {
  const result = await db.query<AssetRow>(
    `select ${assetFields}
    from assets
    where shoot_id = $1
    order by captured_at asc nulls last, created_at asc, original_filename asc`,
    [shootId]
  );

  return result.rows.map(mapAssetRow);
}

export async function listAssetsForUploadBatch(
  db: Queryable,
  uploadBatchId: string
): Promise<Asset[]> {
  const result = await db.query<AssetRow>(
    `select ${assetFields}
    from assets
    where upload_batch_id = $1
    order by captured_at asc nulls last, created_at asc, original_filename asc`,
    [uploadBatchId]
  );

  return result.rows.map(mapAssetRow);
}

export async function getAsset(db: Queryable, assetId: string): Promise<Asset | null> {
  const result = await db.query<AssetRow>(
    `select ${assetFields}
    from assets
    where id = $1`,
    [assetId]
  );

  const row = result.rows[0];
  return row ? mapAssetRow(row) : null;
}

export async function createBracketGroups(
  db: Queryable,
  input: {
    shootId: string;
    uploadBatchId: string;
    groups: CandidateBracketGroup[];
  }
): Promise<BracketGroup[]> {
  const createdGroups: BracketGroupRow[] = [];

  for (const group of input.groups) {
    const groupId = randomUUID();
    const result = await db.query<BracketGroupRow>(
      `insert into bracket_groups (
        id,
        shoot_id,
        upload_batch_id,
        status,
        group_index,
        expected_count,
        detected_count,
        confidence,
        grouping_reason
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning ${bracketGroupFields}`,
      [
        groupId,
        input.shootId,
        input.uploadBatchId,
        group.status,
        group.groupIndex,
        group.expectedCount,
        group.detectedCount,
        group.confidence,
        group.groupingReason
      ]
    );
    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to create bracket group");
    }

    createdGroups.push(row);

    for (const [index, assetId] of group.assetIds.entries()) {
      await db.query(
        `insert into bracket_group_assets (
          bracket_group_id,
          asset_id,
          sort_order
        ) values ($1, $2, $3)`,
        [groupId, assetId, index + 1]
      );
    }
  }

  return attachAssetsToGroups(db, createdGroups);
}

export async function listBracketGroupsForShoot(
  db: Queryable,
  shootId: string
): Promise<BracketGroup[]> {
  const result = await db.query<BracketGroupRow>(
    `select ${bracketGroupFields}
    from bracket_groups
    where shoot_id = $1
    order by created_at desc, group_index asc`,
    [shootId]
  );

  return attachAssetsToGroups(db, result.rows);
}

export async function listBracketGroupsForUploadBatch(
  db: Queryable,
  uploadBatchId: string
): Promise<BracketGroup[]> {
  const result = await db.query<BracketGroupRow>(
    `select ${bracketGroupFields}
    from bracket_groups
    where upload_batch_id = $1
    order by group_index asc`,
    [uploadBatchId]
  );

  return attachAssetsToGroups(db, result.rows);
}

export async function getBracketGroupWithAssets(
  db: Queryable,
  groupId: string
): Promise<BracketGroup | null> {
  const result = await db.query<BracketGroupRow>(
    `select ${bracketGroupFields}
    from bracket_groups
    where id = $1`,
    [groupId]
  );

  const groups = await attachAssetsToGroups(db, result.rows);
  return groups[0] ?? null;
}

export async function updateBracketGroupStatus(
  db: Queryable,
  groupId: string,
  status: BracketGroupStatus
): Promise<BracketGroup | null> {
  if (status !== "approved" && status !== "rejected" && status !== "pending_review") {
    throw new Error(`Unsupported bracket group status: ${status}`);
  }

  await db.query(
    `update bracket_groups
    set
      status = $2,
      reviewed_at = case when $2 = 'pending_review' then null else now() end,
      approved_at = case when $2 = 'approved' then now() else null end
    where id = $1`,
    [groupId, status]
  );

  return getBracketGroupWithAssets(db, groupId);
}
