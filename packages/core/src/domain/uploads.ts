export type UploadBatch = {
  id: string;
  shootId: string;
  status: string;
  originalFileCount: number;
  createdAt: Date;
};

export type Asset = {
  id: string;
  shootId: string;
  uploadBatchId: string | null;
  originalFilename: string;
  storageKey: string;
  thumbnailStorageKey: string | null;
  mimeType: string;
  fileExt: string;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  cameraModel: string | null;
  lensModel: string | null;
  capturedAt: Date | null;
  exposureTime: string | null;
  aperture: string | null;
  iso: number | null;
  exposureBias: string | null;
  rawMetadata: Record<string, unknown>;
  createdAt: Date;
};

export type BracketGroupAsset = Asset & {
  sortOrder: number;
};

export type BracketGroup = {
  id: string;
  shootId: string;
  uploadBatchId: string;
  status: BracketGroupStatus;
  groupIndex: number;
  expectedCount: number;
  detectedCount: number;
  confidence: number;
  groupingReason: string | null;
  reviewedAt: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  assets: BracketGroupAsset[];
};

export type AssetMetadataFields = Pick<
  Asset,
  | "width"
  | "height"
  | "cameraModel"
  | "lensModel"
  | "capturedAt"
  | "exposureTime"
  | "aperture"
  | "iso"
  | "exposureBias"
  | "rawMetadata"
>;
import type { BracketGroupStatus } from "./status";
