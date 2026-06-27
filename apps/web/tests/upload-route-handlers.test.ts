import { describe, expect, it } from "vitest";
import type {
  Asset,
  BracketGroup,
  CandidateBracketGroup,
  Shoot,
  StorageAdapter,
  UploadBatch
} from "@structure-locked-hdr/core";
import { handleUploadFiles, type UploadRouteDeps } from "../src/lib/upload-route-handlers";

const shoot: Shoot = {
  id: "shoot-1",
  name: "Maple Street",
  clientName: null,
  propertyAddress: null,
  notes: null,
  tags: [],
  createdAt: new Date("2026-06-27T12:00:00Z"),
  updatedAt: new Date("2026-06-27T12:00:00Z")
};

const uploadBatch: UploadBatch = {
  id: "batch-1",
  shootId: shoot.id,
  status: "uploaded",
  originalFileCount: 1,
  createdAt: new Date("2026-06-27T12:00:00Z")
};

function makeStorage(): StorageAdapter {
  const objects = new Map<string, Buffer>();

  return {
    async putObject(input) {
      const body = Buffer.isBuffer(input.body)
        ? input.body
        : Buffer.from(await new Response(input.body).arrayBuffer());
      objects.set(input.key, body);
      return {
        key: input.key,
        metadata: input.metadata
      };
    },
    async getObject(key) {
      const body = objects.get(key);

      return body
        ? {
            key,
            body,
            metadata: {
              contentType: "application/octet-stream",
              sizeBytes: body.byteLength
            }
          }
        : null;
    },
    async deleteObject(key) {
      objects.delete(key);
    }
  };
}

function makeDeps(): UploadRouteDeps {
  const assets: Asset[] = [];

  return {
    storage: makeStorage(),
    getShoot: async (shootId) => (shootId === shoot.id ? shoot : null),
    createUploadBatch: async () => uploadBatch,
    createAsset: async (input) => {
      const asset: Asset = {
        id: input.id,
        shootId: input.shootId,
        uploadBatchId: input.uploadBatchId,
        originalFilename: input.originalFilename,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        fileExt: input.fileExt,
        fileSizeBytes: input.fileSizeBytes,
        width: input.metadata.width,
        height: input.metadata.height,
        cameraModel: input.metadata.cameraModel,
        lensModel: input.metadata.lensModel,
        capturedAt: input.metadata.capturedAt,
        exposureTime: input.metadata.exposureTime,
        aperture: input.metadata.aperture,
        iso: input.metadata.iso,
        exposureBias: input.metadata.exposureBias,
        rawMetadata: input.metadata.rawMetadata,
        createdAt: new Date("2026-06-27T12:00:00Z")
      };
      assets.push(asset);
      return asset;
    },
    createBracketGroups: async (input) =>
      input.groups.map((group: CandidateBracketGroup): BracketGroup => {
        const groupAssets = group.assetIds.map((assetId, index) => ({
          ...assets.find((asset) => asset.id === assetId)!,
          sortOrder: index + 1
        }));

        return {
          id: `group-${group.groupIndex}`,
          shootId: input.shootId,
          uploadBatchId: input.uploadBatchId,
          status: group.status,
          groupIndex: group.groupIndex,
          expectedCount: group.expectedCount,
          detectedCount: group.detectedCount,
          confidence: group.confidence,
          groupingReason: group.groupingReason,
          reviewedAt: null,
          approvedAt: null,
          createdAt: new Date("2026-06-27T12:00:00Z"),
          assets: groupAssets
        };
      }),
    listAssetsForUploadBatch: async () => assets,
    listBracketGroupsForUploadBatch: async () => []
  };
}

describe("upload route handler", () => {
  it("stores accepted files and returns assets plus candidate groups", async () => {
    const formData = new FormData();
    formData.append("files", new File([Buffer.from("jpeg")], "front.jpg", { type: "image/jpeg" }));

    const response = await handleUploadFiles(
      new Request("http://localhost/api/shoots/shoot-1/uploads", {
        method: "POST",
        body: formData
      }),
      shoot.id,
      makeDeps()
    );
    const body = (await response.json()) as { assets: Asset[]; bracketGroups: BracketGroup[] };

    expect(response.status).toBe(201);
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0]?.originalFilename).toBe("front.jpg");
    expect(body.bracketGroups).toHaveLength(1);
  });

  it("rejects unsupported file extensions", async () => {
    const formData = new FormData();
    formData.append("files", new File([Buffer.from("text")], "notes.txt", { type: "text/plain" }));

    const response = await handleUploadFiles(
      new Request("http://localhost/api/shoots/shoot-1/uploads", {
        method: "POST",
        body: formData
      }),
      shoot.id,
      makeDeps()
    );

    expect(response.status).toBe(400);
  });
});
