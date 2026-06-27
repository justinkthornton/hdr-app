import { randomUUID } from "node:crypto";
import {
  buildOriginalStorageKey,
  extractAssetMetadata,
  getFileExtension,
  groupAssetsForUploadBatch,
  inferMimeType,
  isAcceptedUploadExtension,
  type Asset,
  type BracketGroup,
  type CandidateBracketGroup,
  type Shoot,
  type StorageAdapter,
  type UploadBatch
} from "@structure-locked-hdr/core";
import { jsonResponse } from "./http";
import {
  serializeAsset,
  serializeBracketGroup,
  serializeUploadBatch
} from "./phase-2a-serializers";

export type UploadRouteDeps = {
  storage: StorageAdapter;
  getShoot(shootId: string): Promise<Shoot | null>;
  createUploadBatch(input: {
    shootId: string;
    originalFileCount: number;
    status?: string;
  }): Promise<UploadBatch>;
  createAsset(input: {
    id: string;
    shootId: string;
    uploadBatchId: string;
    originalFilename: string;
    storageKey: string;
    mimeType: string;
    fileExt: string;
    fileSizeBytes: number;
    metadata: ReturnType<typeof extractAssetMetadata>;
  }): Promise<Asset>;
  createBracketGroups(input: {
    shootId: string;
    uploadBatchId: string;
    groups: CandidateBracketGroup[];
  }): Promise<BracketGroup[]>;
  listAssetsForUploadBatch(uploadBatchId: string): Promise<Asset[]>;
  listBracketGroupsForUploadBatch(uploadBatchId: string): Promise<BracketGroup[]>;
};

function isUploadFile(value: FormDataEntryValue): value is File {
  return value instanceof File;
}

function getUploadFiles(formData: FormData): File[] {
  const files = [...formData.getAll("files"), ...formData.getAll("file")].filter(isUploadFile);
  const uniqueFiles: File[] = [];
  const seen = new Set<File>();

  for (const file of files) {
    if (!seen.has(file)) {
      uniqueFiles.push(file);
      seen.add(file);
    }
  }

  return uniqueFiles;
}

export async function handleUploadFiles(
  request: Request,
  shootId: string,
  deps: UploadRouteDeps
): Promise<Response> {
  const shoot = await deps.getShoot(shootId);

  if (!shoot) {
    return jsonResponse(
      {
        error: "shoot_not_found"
      },
      {
        status: 404
      }
    );
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return jsonResponse(
      {
        error: "invalid_multipart_form"
      },
      {
        status: 400
      }
    );
  }

  const files = getUploadFiles(formData);

  if (files.length === 0) {
    return jsonResponse(
      {
        error: "no_files"
      },
      {
        status: 400
      }
    );
  }

  const unsupported = files.filter((file) => !isAcceptedUploadExtension(file.name));

  if (unsupported.length > 0) {
    return jsonResponse(
      {
        error: "unsupported_file_type",
        filenames: unsupported.map((file) => file.name)
      },
      {
        status: 400
      }
    );
  }

  const uploadBatch = await deps.createUploadBatch({
    shootId,
    originalFileCount: files.length
  });
  const createdAssets: Asset[] = [];

  for (const file of files) {
    const assetId = randomUUID();
    const body = Buffer.from(await file.arrayBuffer());
    const mimeType = inferMimeType(file.name, file.type);
    const fileExt = getFileExtension(file.name);
    const storageKey = buildOriginalStorageKey({
      shootId,
      uploadBatchId: uploadBatch.id,
      assetId,
      filename: file.name
    });
    const metadata = extractAssetMetadata({
      filename: file.name,
      mimeType,
      body
    });

    await deps.storage.putObject({
      key: storageKey,
      body,
      metadata: {
        contentType: mimeType,
        sizeBytes: body.byteLength
      }
    });

    try {
      createdAssets.push(
        await deps.createAsset({
          id: assetId,
          shootId,
          uploadBatchId: uploadBatch.id,
          originalFilename: file.name,
          storageKey,
          mimeType,
          fileExt,
          fileSizeBytes: body.byteLength,
          metadata
        })
      );
    } catch (error) {
      await deps.storage.deleteObject(storageKey);
      throw error;
    }
  }

  const candidateGroups = groupAssetsForUploadBatch(createdAssets);
  const bracketGroups = await deps.createBracketGroups({
    shootId,
    uploadBatchId: uploadBatch.id,
    groups: candidateGroups
  });

  return jsonResponse(
    {
      uploadBatch: serializeUploadBatch(uploadBatch),
      assets: createdAssets.map(serializeAsset),
      bracketGroups: bracketGroups.map(serializeBracketGroup)
    },
    {
      status: 201
    }
  );
}
