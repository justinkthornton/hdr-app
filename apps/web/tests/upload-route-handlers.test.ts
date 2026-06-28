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

const defaultUploadLimits = {
  maxFiles: 30,
  maxFileBytes: 104857600,
  maxBatchBytes: 524288000
};

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

type MemoryStorage = StorageAdapter & {
  getKeys(): string[];
  getPutCount(): number;
  getDeleteCount(): number;
};

function makeStorage(): MemoryStorage {
  const objects = new Map<
    string,
    {
      body: Buffer;
      metadata: {
        contentType: string;
        sizeBytes: number;
      };
    }
  >();
  let putCount = 0;
  let deleteCount = 0;

  return {
    async putObject(input) {
      const body = Buffer.isBuffer(input.body)
        ? input.body
        : Buffer.from(await new Response(input.body).arrayBuffer());
      objects.set(input.key, {
        body,
        metadata: input.metadata
      });
      putCount += 1;
      return {
        key: input.key,
        metadata: input.metadata
      };
    },
    async getObject(key) {
      const object = objects.get(key);

      return object
        ? {
            key,
            body: object.body,
            metadata: object.metadata
          }
        : null;
    },
    async deleteObject(key) {
      objects.delete(key);
      deleteCount += 1;
    },
    getKeys() {
      return [...objects.keys()];
    },
    getPutCount() {
      return putCount;
    },
    getDeleteCount() {
      return deleteCount;
    }
  };
}

type TestDeps = UploadRouteDeps & {
  storage: MemoryStorage;
  assets: Asset[];
  bracketGroups: BracketGroup[];
};

function makeDeps(
  overrides: Partial<Pick<UploadRouteDeps, "createAsset" | "createBracketGroups">> & {
    uploadLimits?: UploadRouteDeps["uploadLimits"];
  } = {}
): TestDeps {
  const assets: Asset[] = [];
  const bracketGroups: BracketGroup[] = [];
  const storage = makeStorage();

  return {
    storage,
    uploadLimits: overrides.uploadLimits ?? defaultUploadLimits,
    getShoot: async (shootId) => (shootId === shoot.id ? shoot : null),
    createUploadBatch: async (input) => ({
      ...uploadBatch,
      originalFileCount: input.originalFileCount
    }),
    createAsset:
      overrides.createAsset ??
      (async (input) => {
        const asset: Asset = {
          id: input.id,
          shootId: input.shootId,
          uploadBatchId: input.uploadBatchId,
          originalFilename: input.originalFilename,
          storageKey: input.storageKey,
          thumbnailStorageKey: input.thumbnailStorageKey ?? null,
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
      }),
    createBracketGroups:
      overrides.createBracketGroups ??
      (async (input) =>
        input.groups.map((group: CandidateBracketGroup): BracketGroup => {
          const groupAssets = group.assetIds.map((assetId, index) => ({
            ...assets.find((asset) => asset.id === assetId)!,
            sortOrder: index + 1
          }));
          const bracketGroup: BracketGroup = {
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

          bracketGroups.push(bracketGroup);
          return bracketGroup;
        })),
    listAssetsForUploadBatch: async () => assets,
    listBracketGroupsForUploadBatch: async () => bracketGroups,
    assets,
    bracketGroups
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
    const body = (await response.json()) as {
      groupSummary: {
        uploadedPhotoCount: number;
        detectedGroupCount: number;
        ambiguousPhotoCount: number;
      };
      assets: Asset[];
      bracketGroups: BracketGroup[];
    };

    expect(response.status).toBe(201);
    expect(body.groupSummary).toMatchObject({
      uploadedPhotoCount: 1,
      detectedGroupCount: 1,
      ambiguousPhotoCount: 1
    });
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0]?.originalFilename).toBe("front.jpg");
    expect(body.bracketGroups).toHaveLength(1);
  });

  it("rejects unsupported file extensions", async () => {
    const deps = makeDeps();
    const formData = new FormData();
    formData.append("files", new File([Buffer.from("text")], "notes.txt", { type: "text/plain" }));

    const response = await handleUploadFiles(
      new Request("http://localhost/api/shoots/shoot-1/uploads", {
        method: "POST",
        body: formData
      }),
      shoot.id,
      deps
    );

    expect(response.status).toBe(400);
    expect(deps.storage.getPutCount()).toBe(0);
    expect(deps.assets).toHaveLength(0);
    expect(deps.bracketGroups).toHaveLength(0);
  });

  it("rejects too many files before storage writes", async () => {
    const deps = makeDeps({
      uploadLimits: {
        ...defaultUploadLimits,
        maxFiles: 1
      }
    });
    const formData = new FormData();
    formData.append("files", new File([Buffer.from("a")], "front.jpg", { type: "image/jpeg" }));
    formData.append("files", new File([Buffer.from("b")], "back.jpg", { type: "image/jpeg" }));

    const response = await handleUploadFiles(
      new Request("http://localhost/api/shoots/shoot-1/uploads", {
        method: "POST",
        body: formData
      }),
      shoot.id,
      deps
    );
    const body = (await response.json()) as { error: string; maxFiles: number };

    expect(response.status).toBe(400);
    expect(body.error).toBe("too_many_files");
    expect(body.maxFiles).toBe(1);
    expect(deps.storage.getPutCount()).toBe(0);
    expect(deps.assets).toHaveLength(0);
    expect(deps.bracketGroups).toHaveLength(0);
  });

  it("rejects oversized files before storage writes", async () => {
    const deps = makeDeps({
      uploadLimits: {
        ...defaultUploadLimits,
        maxFileBytes: 3
      }
    });
    const formData = new FormData();
    formData.append("files", new File([Buffer.from("jpeg")], "front.jpg", { type: "image/jpeg" }));

    const response = await handleUploadFiles(
      new Request("http://localhost/api/shoots/shoot-1/uploads", {
        method: "POST",
        body: formData
      }),
      shoot.id,
      deps
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("file_too_large");
    expect(deps.storage.getPutCount()).toBe(0);
    expect(deps.assets).toHaveLength(0);
    expect(deps.bracketGroups).toHaveLength(0);
  });

  it("rejects oversized batches before storage writes", async () => {
    const deps = makeDeps({
      uploadLimits: {
        ...defaultUploadLimits,
        maxBatchBytes: 5
      }
    });
    const formData = new FormData();
    formData.append("files", new File([Buffer.from("abc")], "front.jpg", { type: "image/jpeg" }));
    formData.append("files", new File([Buffer.from("def")], "back.jpg", { type: "image/jpeg" }));

    const response = await handleUploadFiles(
      new Request("http://localhost/api/shoots/shoot-1/uploads", {
        method: "POST",
        body: formData
      }),
      shoot.id,
      deps
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("batch_too_large");
    expect(deps.storage.getPutCount()).toBe(0);
    expect(deps.assets).toHaveLength(0);
    expect(deps.bracketGroups).toHaveLength(0);
  });

  it("removes written storage objects when asset creation fails", async () => {
    const deps = makeDeps({
      createAsset: async () => {
        throw new Error("asset write failed");
      }
    });
    const formData = new FormData();
    formData.append("files", new File([Buffer.from("jpeg")], "front.jpg", { type: "image/jpeg" }));

    const response = await handleUploadFiles(
      new Request("http://localhost/api/shoots/shoot-1/uploads", {
        method: "POST",
        body: formData
      }),
      shoot.id,
      deps
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("upload_failed");
    expect(deps.storage.getPutCount()).toBe(1);
    expect(deps.storage.getDeleteCount()).toBe(1);
    expect(deps.storage.getKeys()).toHaveLength(0);
  });
});
