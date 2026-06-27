import type { Asset, BracketGroup, UploadBatch } from "@structure-locked-hdr/core";

export type AssetSerializationMode = "admin" | "api";

export type AssetSerializationOptions = {
  mode?: AssetSerializationMode | undefined;
};

export function serializeUploadBatch(uploadBatch: UploadBatch): Record<string, unknown> {
  return {
    id: uploadBatch.id,
    shootId: uploadBatch.shootId,
    status: uploadBatch.status,
    originalFileCount: uploadBatch.originalFileCount,
    createdAt: uploadBatch.createdAt.toISOString()
  };
}

function getExtractionStatus(asset: Asset): string | null {
  const status = asset.rawMetadata.extractionStatus;
  return typeof status === "string" ? status : null;
}

export function serializeAsset(
  asset: Asset,
  options: AssetSerializationOptions = {}
): Record<string, unknown> {
  const serialized = {
    id: asset.id,
    shootId: asset.shootId,
    uploadBatchId: asset.uploadBatchId,
    originalFilename: asset.originalFilename,
    mimeType: asset.mimeType,
    fileExt: asset.fileExt,
    fileSizeBytes: asset.fileSizeBytes,
    width: asset.width,
    height: asset.height,
    cameraModel: asset.cameraModel,
    lensModel: asset.lensModel,
    capturedAt: asset.capturedAt?.toISOString() ?? null,
    exposureTime: asset.exposureTime,
    aperture: asset.aperture,
    iso: asset.iso,
    exposureBias: asset.exposureBias,
    extractionStatus: getExtractionStatus(asset),
    createdAt: asset.createdAt.toISOString()
  };

  if (options.mode === "api") {
    return serialized;
  }

  return {
    ...serialized,
    storageKey: asset.storageKey,
    rawMetadata: asset.rawMetadata
  };
}

export function serializeBracketGroup(
  group: BracketGroup,
  options: AssetSerializationOptions = {}
): Record<string, unknown> {
  return {
    id: group.id,
    shootId: group.shootId,
    uploadBatchId: group.uploadBatchId,
    status: group.status,
    groupIndex: group.groupIndex,
    expectedCount: group.expectedCount,
    detectedCount: group.detectedCount,
    confidence: group.confidence,
    groupingReason: group.groupingReason,
    reviewedAt: group.reviewedAt?.toISOString() ?? null,
    approvedAt: group.approvedAt?.toISOString() ?? null,
    createdAt: group.createdAt.toISOString(),
    assets: group.assets.map((asset) => ({
      ...serializeAsset(asset, options),
      sortOrder: asset.sortOrder
    }))
  };
}
