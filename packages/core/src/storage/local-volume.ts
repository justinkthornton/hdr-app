import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter, StorageObjectMetadata, StoredObject } from "./adapter";

const fallbackFilename = "upload";

function assertSafeStorageSegment(value: string, label: string): string {
  if (
    value.length === 0 ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\")
  ) {
    throw new Error(`${label} must be a single safe storage path segment.`);
  }

  return value;
}

export function sanitizeFilename(filename: string): string {
  const normalized = filename.replace(/\\/g, "/");
  const basename = path.posix.basename(normalized).normalize("NFKD");
  const safe = basename
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-+(\.[A-Za-z0-9]+)$/g, "$1")
    .replace(/^\.+/, "")
    .replace(/[.-]+$/g, "")
    .slice(0, 180);

  return safe.length > 0 ? safe : fallbackFilename;
}

export function assertSafeStorageKey(key: string): string {
  const normalized = path.posix.normalize(key);
  const parts = normalized.split("/");

  if (
    key.length === 0 ||
    path.posix.isAbsolute(key) ||
    normalized.startsWith("../") ||
    normalized === ".." ||
    parts.includes("..")
  ) {
    throw new Error("Storage key must be relative and may not traverse directories.");
  }

  return normalized;
}

export function buildOriginalStorageKey(input: {
  shootId: string;
  uploadBatchId: string;
  assetId: string;
  filename: string;
}): string {
  const safeFilename = sanitizeFilename(input.filename);
  const shootId = assertSafeStorageSegment(input.shootId, "shootId");
  const uploadBatchId = assertSafeStorageSegment(input.uploadBatchId, "uploadBatchId");
  const assetId = assertSafeStorageSegment(input.assetId, "assetId");

  return assertSafeStorageKey(
    ["shoots", shootId, "uploads", uploadBatchId, "originals", `${assetId}-${safeFilename}`].join(
      "/"
    )
  );
}

export function buildThumbnailStorageKey(input: {
  shootId: string;
  uploadBatchId: string;
  assetId: string;
}): string {
  const shootId = assertSafeStorageSegment(input.shootId, "shootId");
  const uploadBatchId = assertSafeStorageSegment(input.uploadBatchId, "uploadBatchId");
  const assetId = assertSafeStorageSegment(input.assetId, "assetId");

  return assertSafeStorageKey(
    ["shoots", shootId, "uploads", uploadBatchId, "thumbnails", `${assetId}.jpg`].join("/")
  );
}

export function buildExportStorageKey(input: {
  shootId: string;
  jobId: string;
  filename: string;
}): string {
  const shootId = assertSafeStorageSegment(input.shootId, "shootId");
  const jobId = assertSafeStorageSegment(input.jobId, "jobId");
  const safeFilename = sanitizeFilename(input.filename);

  return assertSafeStorageKey(
    ["shoots", shootId, "jobs", jobId, "exports", safeFilename].join("/")
  );
}

async function bodyToBuffer(body: ReadableStream<Uint8Array> | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(body)) {
    return body;
  }

  const chunks: Uint8Array[] = [];
  const reader = body.getReader();

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export class LocalVolumeStorage implements StorageAdapter {
  constructor(private readonly root: string) {}

  private resolveObjectPath(key: string): string {
    const safeKey = assertSafeStorageKey(key);
    const resolvedRoot = path.resolve(this.root);
    const resolvedPath = path.resolve(resolvedRoot, safeKey);

    if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
      throw new Error("Storage key resolved outside LOCAL_STORAGE_ROOT.");
    }

    return resolvedPath;
  }

  async putObject(input: {
    key: string;
    body: ReadableStream<Uint8Array> | Buffer;
    metadata: StorageObjectMetadata;
  }): Promise<StoredObject> {
    const objectPath = this.resolveObjectPath(input.key);
    const body = await bodyToBuffer(input.body);

    await mkdir(path.dirname(objectPath), {
      recursive: true
    });
    await writeFile(objectPath, body);

    return {
      key: assertSafeStorageKey(input.key),
      metadata: {
        ...input.metadata,
        sizeBytes: body.byteLength
      }
    };
  }

  async getObject(key: string): Promise<StoredObject | null> {
    const objectPath = this.resolveObjectPath(key);

    try {
      const [body, metadata] = await Promise.all([readFile(objectPath), stat(objectPath)]);
      return {
        key: assertSafeStorageKey(key),
        body,
        metadata: {
          contentType: "application/octet-stream",
          sizeBytes: metadata.size
        }
      };
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    const objectPath = this.resolveObjectPath(key);

    try {
      await unlink(objectPath);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return;
      }

      throw error;
    }
  }
}
