import { describe, expect, it } from "vitest";
import { extractAssetMetadata, inferMimeType, isAcceptedUploadExtension } from "../src/index";

function writeAscii(buffer: Buffer, cursor: { value: number }, value: string): number {
  const offset = cursor.value;
  buffer.write(`${value}\0`, offset, "ascii");
  cursor.value += Buffer.byteLength(value) + 1;
  return offset;
}

function writeRational(
  buffer: Buffer,
  cursor: { value: number },
  numerator: number,
  denominator: number,
  signed = false
): number {
  const offset = cursor.value;

  if (signed) {
    buffer.writeInt32LE(numerator, offset);
    buffer.writeInt32LE(denominator, offset + 4);
  } else {
    buffer.writeUInt32LE(numerator, offset);
    buffer.writeUInt32LE(denominator, offset + 4);
  }

  cursor.value += 8;
  return offset;
}

function writeEntry(
  buffer: Buffer,
  entryOffset: number,
  input: {
    tag: number;
    type: number;
    count: number;
    value: number;
    shortValue?: number;
  }
): void {
  buffer.writeUInt16LE(input.tag, entryOffset);
  buffer.writeUInt16LE(input.type, entryOffset + 2);
  buffer.writeUInt32LE(input.count, entryOffset + 4);

  if (input.shortValue !== undefined) {
    buffer.writeUInt16LE(input.shortValue, entryOffset + 8);
    buffer.writeUInt16LE(0, entryOffset + 10);
  } else {
    buffer.writeUInt32LE(input.value, entryOffset + 8);
  }
}

function makeSyntheticJpegWithExif(): Buffer {
  const tiff = Buffer.alloc(768);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);

  const ifd0Offset = 8;
  tiff.writeUInt16LE(2, ifd0Offset);
  const cursor = {
    value: ifd0Offset + 2 + 2 * 12 + 4
  };
  const modelOffset = writeAscii(tiff, cursor, "Canon EOS R5");
  const exifIfdOffset = cursor.value;
  const exifEntryCount = 8;
  cursor.value = exifIfdOffset + 2 + exifEntryCount * 12 + 4;
  const capturedAtOffset = writeAscii(tiff, cursor, "2026:06:27 12:00:00");
  const exposureOffset = writeRational(tiff, cursor, 1, 125);
  const apertureOffset = writeRational(tiff, cursor, 8, 1);
  const exposureBiasOffset = writeRational(tiff, cursor, -2, 3, true);
  const lensOffset = writeAscii(tiff, cursor, "RF 15-35mm");

  writeEntry(tiff, ifd0Offset + 2, {
    tag: 0x0110,
    type: 2,
    count: "Canon EOS R5".length + 1,
    value: modelOffset
  });
  writeEntry(tiff, ifd0Offset + 14, {
    tag: 0x8769,
    type: 4,
    count: 1,
    value: exifIfdOffset
  });

  tiff.writeUInt16LE(exifEntryCount, exifIfdOffset);
  const exifEntries = exifIfdOffset + 2;
  writeEntry(tiff, exifEntries, {
    tag: 0x9003,
    type: 2,
    count: "2026:06:27 12:00:00".length + 1,
    value: capturedAtOffset
  });
  writeEntry(tiff, exifEntries + 12, {
    tag: 0x829a,
    type: 5,
    count: 1,
    value: exposureOffset
  });
  writeEntry(tiff, exifEntries + 24, {
    tag: 0x829d,
    type: 5,
    count: 1,
    value: apertureOffset
  });
  writeEntry(tiff, exifEntries + 36, {
    tag: 0x8827,
    type: 3,
    count: 1,
    value: 0,
    shortValue: 200
  });
  writeEntry(tiff, exifEntries + 48, {
    tag: 0x9204,
    type: 10,
    count: 1,
    value: exposureBiasOffset
  });
  writeEntry(tiff, exifEntries + 60, {
    tag: 0xa434,
    type: 2,
    count: "RF 15-35mm".length + 1,
    value: lensOffset
  });
  writeEntry(tiff, exifEntries + 72, {
    tag: 0xa002,
    type: 4,
    count: 1,
    value: 1920
  });
  writeEntry(tiff, exifEntries + 84, {
    tag: 0xa003,
    type: 4,
    count: 1,
    value: 1080
  });

  const exifPayload = Buffer.concat([
    Buffer.from("Exif\0\0", "binary"),
    tiff.subarray(0, cursor.value)
  ]);
  const app1Length = Buffer.alloc(2);
  app1Length.writeUInt16BE(exifPayload.length + 2);

  const sofPayload = Buffer.from([0x08, 0x04, 0x38, 0x07, 0x80, 0x01, 0x11, 0x00]);
  const sofLength = Buffer.alloc(2);
  sofLength.writeUInt16BE(sofPayload.length + 2);

  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe1]),
    app1Length,
    exifPayload,
    Buffer.from([0xff, 0xc0]),
    sofLength,
    sofPayload,
    Buffer.from([0xff, 0xd9])
  ]);
}

describe("metadata extraction", () => {
  it("extracts JPEG EXIF and dimensions", () => {
    const metadata = extractAssetMetadata({
      filename: "bracket-001.jpg",
      mimeType: "image/jpeg",
      body: makeSyntheticJpegWithExif()
    });

    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(1080);
    expect(metadata.cameraModel).toBe("Canon EOS R5");
    expect(metadata.lensModel).toBe("RF 15-35mm");
    expect(metadata.capturedAt?.toISOString()).toBe("2026-06-27T12:00:00.000Z");
    expect(metadata.exposureTime).toBe("0.008");
    expect(metadata.aperture).toBe("f/8");
    expect(metadata.iso).toBe(200);
    expect(metadata.exposureBias).toBe("-0.67 EV");
    expect(metadata.rawMetadata.extractionStatus).toBe("extracted");
  });

  it("accepts RAW extensions while marking metadata partial", () => {
    expect(isAcceptedUploadExtension("image.CR3")).toBe(true);
    expect(inferMimeType("image.CR3")).toBe("image/x-canon-cr3");

    const metadata = extractAssetMetadata({
      filename: "image.CR3",
      mimeType: "image/x-canon-cr3",
      body: Buffer.from("raw")
    });

    expect(metadata.capturedAt).toBeNull();
    expect(metadata.rawMetadata.extractionStatus).toBe("partial");
  });
});
