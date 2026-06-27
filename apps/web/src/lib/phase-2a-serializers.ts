import type { Asset, BracketGroup, UploadBatch } from "@structure-locked-hdr/core";

export function serializeUploadBatch(uploadBatch: UploadBatch): Record<string, unknown> {
  return {
    id: uploadBatch.id,
    shootId: uploadBatch.shootId,
    status: uploadBatch.status,
    originalFileCount: uploadBatch.originalFileCount,
    createdAt: uploadBatch.createdAt.toISOString()
  };
}

export function serializeAsset(asset: Asset): Record<string, unknown> {
  return {
    id: asset.id,
    shootId: asset.shootId,
    uploadBatchId: asset.uploadBatchId,
    originalFilename: asset.originalFilename,
    storageKey: asset.storageKey,
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
    rawMetadata: asset.rawMetadata,
    createdAt: asset.createdAt.toISOString()
  };
}

export function serializeBracketGroup(group: BracketGroup): Record<string, unknown> {
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
      ...serializeAsset(asset),
      sortOrder: asset.sortOrder
    }))
  };
}
