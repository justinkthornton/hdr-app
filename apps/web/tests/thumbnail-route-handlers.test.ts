import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  type Asset,
  type StorageAdapter
} from "@structure-locked-hdr/core";
import {
  handleGetAssetThumbnail,
  type ThumbnailRouteDeps
} from "../src/lib/thumbnail-route-handlers";

const asset: Asset = {
  id: "asset-1",
  shootId: "shoot-1",
  uploadBatchId: "batch-1",
  originalFilename: "front.jpg",
  storageKey: "shoots/shoot-1/uploads/batch-1/originals/asset-1-front.jpg",
  thumbnailStorageKey: "shoots/shoot-1/uploads/batch-1/thumbnails/asset-1.jpg",
  mimeType: "image/jpeg",
  fileExt: ".jpg",
  fileSizeBytes: 1000,
  width: 1920,
  height: 1080,
  cameraModel: "Canon EOS R5",
  lensModel: null,
  capturedAt: new Date("2026-06-27T12:00:00Z"),
  exposureTime: "1/125",
  aperture: "f/8",
  iso: 200,
  exposureBias: null,
  rawMetadata: {
    extractionStatus: "extracted"
  },
  createdAt: new Date("2026-06-27T12:00:00Z")
};

function makeStorage(): StorageAdapter {
  return {
    async putObject(input) {
      return {
        key: input.key,
        metadata: input.metadata
      };
    },
    async getObject(key) {
      if (key !== asset.thumbnailStorageKey) {
        return null;
      }

      return {
        key,
        body: Buffer.from("thumbnail-jpeg"),
        metadata: {
          contentType: "image/jpeg",
          sizeBytes: 14
        }
      };
    },
    async deleteObject() {}
  };
}

function makeDeps(overrides: Partial<ThumbnailRouteDeps> = {}): ThumbnailRouteDeps {
  return {
    storage: makeStorage(),
    getAsset: async (assetId) => (assetId === asset.id ? asset : null),
    ...overrides
  };
}

function adminRequest(): Request {
  process.env.ADMIN_SESSION_SECRET = "test-session-secret-at-least-32-characters";
  const token = createAdminSessionToken(process.env.ADMIN_SESSION_SECRET);

  return new Request("http://localhost/api/assets/asset-1/thumbnail", {
    headers: {
      cookie: `${ADMIN_SESSION_COOKIE}=${token}`
    }
  });
}

describe("thumbnail route handler", () => {
  it("requires an admin session", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-session-secret-at-least-32-characters";

    const response = await handleGetAssetThumbnail(
      new Request("http://localhost/api/assets/asset-1/thumbnail"),
      asset.id,
      makeDeps()
    );

    expect(response.status).toBe(401);
  });

  it("returns a stored thumbnail for an authorized admin request", async () => {
    const response = await handleGetAssetThumbnail(adminRequest(), asset.id, makeDeps());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(await response.text()).toBe("thumbnail-jpeg");
  });

  it("returns 404 when an asset has no thumbnail", async () => {
    const response = await handleGetAssetThumbnail(
      adminRequest(),
      asset.id,
      makeDeps({
        getAsset: async () => ({
          ...asset,
          thumbnailStorageKey: null
        })
      })
    );

    expect(response.status).toBe(404);
  });
});
