import {
  createAsset,
  createBracketGroups,
  createUploadBatch,
  getBracketGroupWithAssets,
  getPool,
  getShoot,
  listAssetsForShoot,
  listAssetsForUploadBatch,
  listBracketGroupsForShoot,
  listBracketGroupsForUploadBatch,
  LocalVolumeStorage,
  parseRuntimeEnv,
  updateBracketGroupStatus
} from "@structure-locked-hdr/core";
import type { BracketGroupRouteDeps } from "./bracket-route-handlers";
import type { UploadRouteDeps } from "./upload-route-handlers";

export function makePhase2ADeps(): UploadRouteDeps & BracketGroupRouteDeps {
  const pool = getPool();
  const env = parseRuntimeEnv();

  return {
    storage: new LocalVolumeStorage(env.LOCAL_STORAGE_ROOT),
    uploadLimits: {
      maxFiles: env.MAX_UPLOAD_FILES,
      maxFileBytes: env.MAX_UPLOAD_FILE_BYTES,
      maxBatchBytes: env.MAX_UPLOAD_BATCH_BYTES
    },
    getShoot: (shootId) => getShoot(pool, shootId),
    createUploadBatch: (input) => createUploadBatch(pool, input),
    createAsset: (input) => createAsset(pool, input),
    createBracketGroups: (input) => createBracketGroups(pool, input),
    listAssetsForShoot: (shootId) => listAssetsForShoot(pool, shootId),
    listAssetsForUploadBatch: (uploadBatchId) => listAssetsForUploadBatch(pool, uploadBatchId),
    listBracketGroupsForShoot: (shootId) => listBracketGroupsForShoot(pool, shootId),
    listBracketGroupsForUploadBatch: (uploadBatchId) =>
      listBracketGroupsForUploadBatch(pool, uploadBatchId),
    getBracketGroupWithAssets: (groupId) => getBracketGroupWithAssets(pool, groupId),
    updateBracketGroupStatus: (groupId, status) => updateBracketGroupStatus(pool, groupId, status)
  };
}
