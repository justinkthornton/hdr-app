import type { Asset, StorageAdapter } from "@structure-locked-hdr/core";
import { requireAdminRequest } from "./admin-auth";
import { jsonResponse } from "./http";

export type ThumbnailRouteDeps = {
  storage: StorageAdapter;
  getAsset(assetId: string): Promise<Asset | null>;
};

export async function handleGetAssetThumbnail(
  request: Request,
  assetId: string,
  deps: ThumbnailRouteDeps
): Promise<Response> {
  const unauthorized = requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const asset = await deps.getAsset(assetId);

  if (!asset?.thumbnailStorageKey) {
    return jsonResponse(
      {
        error: "thumbnail_not_found"
      },
      {
        status: 404
      }
    );
  }

  const stored = await deps.storage.getObject(asset.thumbnailStorageKey);

  if (!stored?.body) {
    return jsonResponse(
      {
        error: "thumbnail_not_found"
      },
      {
        status: 404
      }
    );
  }

  return new Response(new Uint8Array(stored.body), {
    headers: {
      "cache-control": "private, max-age=3600",
      "content-length": String(stored.body.byteLength),
      "content-type": "image/jpeg"
    }
  });
}
