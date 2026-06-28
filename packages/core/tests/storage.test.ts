import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildOriginalStorageKey,
  buildThumbnailStorageKey,
  LocalVolumeStorage,
  sanitizeFilename
} from "../src/index";

describe("LocalVolumeStorage", () => {
  it("sanitizes filenames before key construction", () => {
    expect(sanitizeFilename("../Client Kitchen.CR3")).toBe("Client-Kitchen.CR3");
    expect(sanitizeFilename("folder\\bad name?.jpg")).toBe("bad-name.jpg");
    expect(sanitizeFilename("...")).toBe("upload");
  });

  it("constructs thumbnail keys inside the upload thumbnail folder", () => {
    expect(
      buildThumbnailStorageKey({
        shootId: "shoot-1",
        uploadBatchId: "batch-1",
        assetId: "asset-1"
      })
    ).toBe("shoots/shoot-1/uploads/batch-1/thumbnails/asset-1.jpg");
  });

  it("prevents path traversal and supports put/get/delete", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "slhdr-storage-"));
    const storage = new LocalVolumeStorage(root);
    const key = buildOriginalStorageKey({
      shootId: "shoot-1",
      uploadBatchId: "batch-1",
      assetId: "asset-1",
      filename: "../front exterior.jpg"
    });

    await storage.putObject({
      key,
      body: Buffer.from("image-bytes"),
      metadata: {
        contentType: "image/jpeg",
        sizeBytes: 11
      }
    });

    const stored = await storage.getObject(key);
    expect(stored?.body?.toString("utf8")).toBe("image-bytes");

    await storage.deleteObject(key);
    await expect(storage.getObject(key)).resolves.toBeNull();
    await expect(
      storage.putObject({
        key: "../outside.jpg",
        body: Buffer.from("bad"),
        metadata: {
          contentType: "image/jpeg",
          sizeBytes: 3
        }
      })
    ).rejects.toThrow(/relative/);
  });
});
