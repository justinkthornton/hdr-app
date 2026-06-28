import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  buildThumbnailStorageKey,
  generateJpegThumbnail,
  isJpegUpload,
  jpegThumbnailMaxHeight,
  jpegThumbnailMaxWidth
} from "../src/index";

describe("JPEG thumbnails", () => {
  it("builds safe thumbnail storage keys", () => {
    expect(
      buildThumbnailStorageKey({
        shootId: "shoot-1",
        uploadBatchId: "batch-1",
        assetId: "asset-1"
      })
    ).toBe("shoots/shoot-1/uploads/batch-1/thumbnails/asset-1.jpg");

    expect(() =>
      buildThumbnailStorageKey({
        shootId: "../shoot-1",
        uploadBatchId: "batch-1",
        assetId: "asset-1"
      })
    ).toThrow(/safe storage/);
  });

  it("generates a small JPEG thumbnail from a JPEG upload", async () => {
    const original = await sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: {
          r: 31,
          g: 111,
          b: 91
        }
      }
    })
      .jpeg()
      .toBuffer();

    const thumbnail = await generateJpegThumbnail({
      filename: "front.jpg",
      body: original
    });
    const metadata = thumbnail ? await sharp(thumbnail).metadata() : null;

    expect(thumbnail).toBeInstanceOf(Buffer);
    expect(metadata?.format).toBe("jpeg");
    expect(metadata?.width).toBeLessThanOrEqual(jpegThumbnailMaxWidth);
    expect(metadata?.height).toBeLessThanOrEqual(jpegThumbnailMaxHeight);
    expect(thumbnail!.byteLength).toBeLessThan(original.byteLength);
  });

  it("skips non-JPEG uploads and malformed JPEG buffers", async () => {
    expect(isJpegUpload("front.tif")).toBe(false);
    await expect(
      generateJpegThumbnail({
        filename: "front.tif",
        body: Buffer.from("not-jpeg")
      })
    ).resolves.toBeNull();
    await expect(
      generateJpegThumbnail({
        filename: "front.jpg",
        body: Buffer.from("not-jpeg")
      })
    ).resolves.toBeNull();
  });
});
