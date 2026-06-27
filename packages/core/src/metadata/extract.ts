import path from "node:path";
import type { AssetMetadataFields } from "../domain/uploads";

export const acceptedUploadExtensions = [
  ".jpg",
  ".jpeg",
  ".tif",
  ".tiff",
  ".cr3",
  ".cr2",
  ".dng",
  ".arw",
  ".nef",
  ".raf"
] as const;

type TiffReader = {
  readUInt16(offset: number): number;
  readUInt32(offset: number): number;
  readInt32(offset: number): number;
};

type RawExifValue = string | number | null;

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export function isAcceptedUploadExtension(filename: string): boolean {
  return acceptedUploadExtensions.includes(
    getFileExtension(filename) as (typeof acceptedUploadExtensions)[number]
  );
}

export function inferMimeType(filename: string, providedType?: string): string {
  if (providedType && providedType !== "application/octet-stream") {
    return providedType;
  }

  switch (getFileExtension(filename)) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    case ".dng":
      return "image/x-adobe-dng";
    case ".cr2":
      return "image/x-canon-cr2";
    case ".cr3":
      return "image/x-canon-cr3";
    case ".arw":
      return "image/x-sony-arw";
    case ".nef":
      return "image/x-nikon-nef";
    case ".raf":
      return "image/x-fuji-raf";
    default:
      return "application/octet-stream";
  }
}

function emptyMetadata(rawMetadata: Record<string, unknown>): AssetMetadataFields {
  return {
    width: null,
    height: null,
    cameraModel: null,
    lensModel: null,
    capturedAt: null,
    exposureTime: null,
    aperture: null,
    iso: null,
    exposureBias: null,
    rawMetadata
  };
}

function parseExifDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\0.*)?$/);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
}

function formatRational(value: RawExifValue): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }

  return null;
}

function formatAperture(value: RawExifValue): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return `f/${value.toFixed(1).replace(/\.0$/, "")}`;
}

function formatExposureBias(value: RawExifValue): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return `${value.toFixed(2).replace(/\.00$/, "").replace(/0$/, "")} EV`;
}

function makeTiffReader(buffer: Buffer, tiffOffset: number, littleEndian: boolean): TiffReader {
  return {
    readUInt16(offset: number) {
      return littleEndian
        ? buffer.readUInt16LE(tiffOffset + offset)
        : buffer.readUInt16BE(tiffOffset + offset);
    },
    readUInt32(offset: number) {
      return littleEndian
        ? buffer.readUInt32LE(tiffOffset + offset)
        : buffer.readUInt32BE(tiffOffset + offset);
    },
    readInt32(offset: number) {
      return littleEndian
        ? buffer.readInt32LE(tiffOffset + offset)
        : buffer.readInt32BE(tiffOffset + offset);
    }
  };
}

function readAscii(buffer: Buffer, tiffOffset: number, offset: number, count: number): string {
  return buffer
    .subarray(tiffOffset + offset, tiffOffset + offset + count)
    .toString("utf8")
    .replace(/\0+$/g, "")
    .trim();
}

function readRational(reader: TiffReader, offset: number, signed: boolean): number | null {
  const numerator = signed ? reader.readInt32(offset) : reader.readUInt32(offset);
  const denominator = signed ? reader.readInt32(offset + 4) : reader.readUInt32(offset + 4);

  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

function readExifValue(input: {
  buffer: Buffer;
  reader: TiffReader;
  tiffOffset: number;
  type: number;
  count: number;
  valueOrOffset: number;
  inlineShortValue: number | null;
}): RawExifValue {
  const { buffer, reader, tiffOffset, type, count, valueOrOffset, inlineShortValue } = input;

  switch (type) {
    case 2:
      return readAscii(buffer, tiffOffset, valueOrOffset, count);
    case 3:
      return count === 1 ? inlineShortValue : null;
    case 4:
      return count === 1 ? valueOrOffset : null;
    case 5:
      return count === 1 ? readRational(reader, valueOrOffset, false) : null;
    case 9:
      return count === 1 ? valueOrOffset : null;
    case 10:
      return count === 1 ? readRational(reader, valueOrOffset, true) : null;
    default:
      return null;
  }
}

function readIfd(input: {
  buffer: Buffer;
  reader: TiffReader;
  tiffOffset: number;
  ifdOffset: number;
}): Map<number, RawExifValue> {
  const { buffer, reader, tiffOffset, ifdOffset } = input;
  const values = new Map<number, RawExifValue>();
  const entryCount = reader.readUInt16(ifdOffset);

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    const tag = reader.readUInt16(entryOffset);
    const type = reader.readUInt16(entryOffset + 2);
    const count = reader.readUInt32(entryOffset + 4);
    const valueOrOffset = reader.readUInt32(entryOffset + 8);
    const inlineShortValue = type === 3 && count === 1 ? reader.readUInt16(entryOffset + 8) : null;

    if (tiffOffset + valueOrOffset >= buffer.length && type !== 3 && type !== 4 && type !== 9) {
      continue;
    }

    values.set(
      tag,
      readExifValue({
        buffer,
        reader,
        tiffOffset,
        type,
        count,
        valueOrOffset,
        inlineShortValue
      })
    );
  }

  return values;
}

function findJpegSegments(buffer: Buffer): { marker: number; start: number; length: number }[] {
  const segments: { marker: number; start: number; length: number }[] = [];

  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return segments;
  }

  let offset = 2;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1] ?? 0;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const length = buffer.readUInt16BE(offset + 2);

    if (length < 2 || offset + 2 + length > buffer.length) {
      break;
    }

    segments.push({
      marker,
      start: offset + 4,
      length: length - 2
    });
    offset += 2 + length;
  }

  return segments;
}

function parseJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  for (const segment of findJpegSegments(buffer)) {
    if ([0xc0, 0xc1, 0xc2].includes(segment.marker) && segment.length >= 7) {
      return {
        height: buffer.readUInt16BE(segment.start + 1),
        width: buffer.readUInt16BE(segment.start + 3)
      };
    }
  }

  return null;
}

function parseJpegExif(buffer: Buffer): Partial<AssetMetadataFields> & {
  exifFound: boolean;
  parsedTags: Record<string, unknown>;
} {
  for (const segment of findJpegSegments(buffer)) {
    if (segment.marker !== 0xe1 || segment.length < 14) {
      continue;
    }

    const header = buffer.subarray(segment.start, segment.start + 6).toString("binary");

    if (header !== "Exif\0\0") {
      continue;
    }

    const tiffOffset = segment.start + 6;
    const byteOrder = buffer.subarray(tiffOffset, tiffOffset + 2).toString("ascii");
    const littleEndian = byteOrder === "II";

    if (!littleEndian && byteOrder !== "MM") {
      continue;
    }

    const reader = makeTiffReader(buffer, tiffOffset, littleEndian);
    const firstIfdOffset = reader.readUInt32(4);
    const ifd0 = readIfd({
      buffer,
      reader,
      tiffOffset,
      ifdOffset: firstIfdOffset
    });
    const exifIfdOffset = ifd0.get(0x8769);
    const exifIfd =
      typeof exifIfdOffset === "number"
        ? readIfd({
            buffer,
            reader,
            tiffOffset,
            ifdOffset: exifIfdOffset
          })
        : new Map<number, RawExifValue>();

    const parsedTags: Record<string, RawExifValue> = {
      model: ifd0.get(0x0110) ?? null,
      lensModel: exifIfd.get(0xa434) ?? null,
      dateTimeOriginal: exifIfd.get(0x9003) ?? null,
      exposureTime: exifIfd.get(0x829a) ?? null,
      fNumber: exifIfd.get(0x829d) ?? null,
      iso: exifIfd.get(0x8827) ?? null,
      exposureBias: exifIfd.get(0x9204) ?? null,
      pixelWidth: exifIfd.get(0xa002) ?? null,
      pixelHeight: exifIfd.get(0xa003) ?? null
    };
    const exposureTime = parsedTags.exposureTime ?? null;
    const fNumber = parsedTags.fNumber ?? null;
    const exposureBias = parsedTags.exposureBias ?? null;

    return {
      exifFound: true,
      parsedTags,
      cameraModel: typeof parsedTags.model === "string" ? parsedTags.model : null,
      lensModel: typeof parsedTags.lensModel === "string" ? parsedTags.lensModel : null,
      capturedAt:
        typeof parsedTags.dateTimeOriginal === "string"
          ? parseExifDate(parsedTags.dateTimeOriginal)
          : null,
      exposureTime: formatRational(exposureTime),
      aperture: formatAperture(fNumber),
      iso: typeof parsedTags.iso === "number" ? parsedTags.iso : null,
      exposureBias: formatExposureBias(exposureBias),
      width: typeof parsedTags.pixelWidth === "number" ? parsedTags.pixelWidth : null,
      height: typeof parsedTags.pixelHeight === "number" ? parsedTags.pixelHeight : null
    };
  }

  return {
    exifFound: false,
    parsedTags: {}
  };
}

export function extractAssetMetadata(input: {
  filename: string;
  mimeType: string;
  body: Buffer;
}): AssetMetadataFields {
  const extension = getFileExtension(input.filename);

  if (extension !== ".jpg" && extension !== ".jpeg") {
    return emptyMetadata({
      extractionStatus: "partial",
      extractionLimitation:
        "Phase 2A stores this file type but JPEG metadata extraction is the only fully supported parser.",
      fileExt: extension,
      mimeType: input.mimeType
    });
  }

  const dimensions = parseJpegDimensions(input.body);
  const exif = parseJpegExif(input.body);

  return {
    width: exif.width ?? dimensions?.width ?? null,
    height: exif.height ?? dimensions?.height ?? null,
    cameraModel: exif.cameraModel ?? null,
    lensModel: exif.lensModel ?? null,
    capturedAt: exif.capturedAt ?? null,
    exposureTime: exif.exposureTime ?? null,
    aperture: exif.aperture ?? null,
    iso: exif.iso ?? null,
    exposureBias: exif.exposureBias ?? null,
    rawMetadata: {
      extractionStatus: exif.exifFound ? "extracted" : "partial",
      parser: "built-in-jpeg-exif",
      exifFound: exif.exifFound,
      dimensionsFound: Boolean(dimensions),
      tags: exif.parsedTags
    }
  };
}
