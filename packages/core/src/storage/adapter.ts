export type StorageObjectMetadata = {
  contentType: string;
  sizeBytes: number;
};

export type StoredObject = {
  key: string;
  metadata: StorageObjectMetadata;
};

export interface StorageAdapter {
  putObject(input: {
    key: string;
    body: ReadableStream<Uint8Array> | Buffer;
    metadata: StorageObjectMetadata;
  }): Promise<StoredObject>;
  getObject(key: string): Promise<StoredObject | null>;
  deleteObject(key: string): Promise<void>;
}
