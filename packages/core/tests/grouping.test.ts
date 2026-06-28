import { describe, expect, it } from "vitest";
import { groupAssetsForUploadBatch, parseExposureDurationMs, type Asset } from "../src/index";

function asset(
  index: number,
  overrides: Partial<Asset> & {
    capturedAt?: Date | null;
  } = {}
): Asset {
  return {
    id: `asset-${index}`,
    shootId: "shoot-1",
    uploadBatchId: "batch-1",
    originalFilename: `image-${String(index).padStart(3, "0")}.jpg`,
    storageKey: `shoots/shoot-1/uploads/batch-1/originals/asset-${index}.jpg`,
    thumbnailStorageKey: null,
    mimeType: "image/jpeg",
    fileExt: ".jpg",
    fileSizeBytes: 1000,
    width: 1920,
    height: 1080,
    cameraModel: "Canon EOS R5",
    lensModel: null,
    capturedAt: new Date(Date.UTC(2026, 5, 27, 12, 0, index)),
    exposureTime: null,
    aperture: null,
    iso: null,
    exposureBias: null,
    rawMetadata: {},
    createdAt: new Date("2026-06-27T12:00:00Z"),
    ...overrides
  };
}

describe("bracket grouping", () => {
  it("parses supported exposure duration strings", () => {
    expect(parseExposureDurationMs("30")).toBe(30000);
    expect(parseExposureDurationMs("30s")).toBe(30000);
    expect(parseExposureDurationMs("30 sec")).toBe(30000);
    expect(parseExposureDurationMs("30 seconds")).toBe(30000);
    expect(parseExposureDurationMs("1/2")).toBe(500);
    expect(parseExposureDurationMs("1/125")).toBe(8);
    expect(parseExposureDurationMs("0.5")).toBe(500);
    expect(parseExposureDurationMs("0.5s")).toBe(500);
  });

  it("rejects unsupported exposure duration strings", () => {
    expect(parseExposureDurationMs(null)).toBeNull();
    expect(parseExposureDurationMs("")).toBeNull();
    expect(parseExposureDurationMs("auto")).toBeNull();
    expect(parseExposureDurationMs("1/0")).toBeNull();
  });

  it("detects one clean 7-shot group", () => {
    const groups = groupAssetsForUploadBatch(Array.from({ length: 7 }, (_, index) => asset(index)));

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      expectedCount: 7,
      detectedCount: 7,
      confidence: 0.95
    });
  });

  it("detects one clean 3-shot group", () => {
    const groups = groupAssetsForUploadBatch(Array.from({ length: 3 }, (_, index) => asset(index)));

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      expectedCount: 3,
      detectedCount: 3
    });
    expect(groups[0]?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("keeps a long-exposure 3-shot bracket grouped by post-exposure gap", () => {
    const groups = groupAssetsForUploadBatch([
      asset(1, {
        capturedAt: new Date("2026-06-27T12:00:00Z"),
        exposureTime: "30"
      }),
      asset(2, {
        capturedAt: new Date("2026-06-27T12:00:31Z"),
        exposureTime: "15"
      }),
      asset(3, {
        capturedAt: new Date("2026-06-27T12:00:47Z"),
        exposureTime: "8"
      })
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      expectedCount: 3,
      detectedCount: 3
    });
  });

  it("keeps a long-exposure 7-shot bracket grouped by post-exposure gap", () => {
    const groups = groupAssetsForUploadBatch([
      asset(1, {
        capturedAt: new Date("2026-06-27T12:00:00Z"),
        exposureTime: "30 seconds"
      }),
      asset(2, {
        capturedAt: new Date("2026-06-27T12:00:31Z"),
        exposureTime: "15"
      }),
      asset(3, {
        capturedAt: new Date("2026-06-27T12:00:47Z"),
        exposureTime: "8"
      }),
      asset(4, {
        capturedAt: new Date("2026-06-27T12:00:56Z"),
        exposureTime: "4"
      }),
      asset(5, {
        capturedAt: new Date("2026-06-27T12:01:01Z"),
        exposureTime: "2"
      }),
      asset(6, {
        capturedAt: new Date("2026-06-27T12:01:04Z"),
        exposureTime: "1"
      }),
      asset(7, {
        capturedAt: new Date("2026-06-27T12:01:06Z"),
        exposureTime: "0.5s"
      })
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      expectedCount: 7,
      detectedCount: 7
    });
  });

  it("splits a large real gap after the previous exposure ends", () => {
    const groups = groupAssetsForUploadBatch([
      asset(1, {
        capturedAt: new Date("2026-06-27T12:00:00Z"),
        exposureTime: "30"
      }),
      asset(2, {
        capturedAt: new Date("2026-06-27T12:00:45Z"),
        exposureTime: "15"
      })
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.some((group) => group.detectedCount === 2)).toBe(false);
    expect(groups.every((group) => group.confidence < 0.8)).toBe(true);
  });

  it("falls back to raw capture-time gaps when exposure time is missing", () => {
    const groups = groupAssetsForUploadBatch([
      asset(1, {
        capturedAt: new Date("2026-06-27T12:00:00Z"),
        exposureTime: null
      }),
      asset(2, {
        capturedAt: new Date("2026-06-27T12:00:31Z"),
        exposureTime: null
      }),
      asset(3, {
        capturedAt: new Date("2026-06-27T12:00:47Z"),
        exposureTime: null
      })
    ]);

    expect(groups).toHaveLength(3);
    expect(groups.some((group) => group.detectedCount === 3)).toBe(false);
  });

  it("detects mixed 7-shot and 3-shot groups in one upload batch", () => {
    const groups = groupAssetsForUploadBatch(
      Array.from({ length: 10 }, (_, index) => asset(index))
    );

    expect(groups.map((group) => group.expectedCount)).toEqual([7, 3]);
  });

  it("marks missing captured_at groups as manual review", () => {
    const groups = groupAssetsForUploadBatch([
      asset(1, { capturedAt: null }),
      asset(2, { capturedAt: null }),
      asset(3, { capturedAt: null })
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.confidence).toBeLessThan(0.8);
    expect(groups[0]?.groupingReason).toContain("Missing EXIF capture time");
  });

  it("partitions mixed camera models", () => {
    const groups = groupAssetsForUploadBatch([
      asset(1, { cameraModel: "Canon EOS R5" }),
      asset(2, { cameraModel: "Canon EOS R5" }),
      asset(3, { cameraModel: "Canon EOS R5" }),
      asset(4, { cameraModel: "DJI Mini 4K" }),
      asset(5, { cameraModel: "DJI Mini 4K" }),
      asset(6, { cameraModel: "DJI Mini 4K" })
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.expectedCount === 3)).toBe(true);
  });

  it("keeps extra unmatched files as an ambiguous group", () => {
    const groups = groupAssetsForUploadBatch(Array.from({ length: 8 }, (_, index) => asset(index)));

    expect(groups).toHaveLength(2);
    expect(groups[0]?.expectedCount).toBe(7);
    expect(groups[1]?.detectedCount).toBe(1);
    expect(groups[1]?.confidence).toBeLessThan(0.8);
  });

  it("uses capture time instead of filename order", () => {
    const groups = groupAssetsForUploadBatch([
      asset(3, {
        originalFilename: "z.jpg",
        capturedAt: new Date("2026-06-27T12:00:03Z")
      }),
      asset(1, {
        originalFilename: "a.jpg",
        capturedAt: new Date("2026-06-27T12:00:01Z")
      }),
      asset(2, {
        originalFilename: "m.jpg",
        capturedAt: new Date("2026-06-27T12:00:02Z")
      })
    ]);

    expect(groups[0]?.assetIds).toEqual(["asset-1", "asset-2", "asset-3"]);
  });
});
