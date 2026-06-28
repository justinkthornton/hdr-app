import {
  createExport,
  createHdrJob,
  getBracketGroupWithAssets,
  getExport,
  getHdrJob,
  getPool,
  listExportsForJob,
  listExportsForShoot,
  listHdrJobsForBracketGroup,
  listHdrJobsForShoot,
  LocalVolumeStorage,
  markHdrJobFailed,
  markHdrJobRunning,
  markHdrJobSucceeded,
  parseRuntimeEnv,
  updateHdrJobStatus
} from "@structure-locked-hdr/core";
import { processHdrJob, type HdrJobRunnerDeps } from "./hdr-job-runner";
import type { HdrJobRouteDeps } from "./hdr-job-route-handlers";

export function makePhase2CDeps(): HdrJobRouteDeps {
  const pool = getPool();
  const env = parseRuntimeEnv();
  const storage = new LocalVolumeStorage(env.LOCAL_STORAGE_ROOT);

  return {
    storage,
    defaultEngineMode: env.HDR_ENGINE_MODE,
    getBracketGroupWithAssets: (groupId) => getBracketGroupWithAssets(pool, groupId),
    createHdrJob: (input) => createHdrJob(pool, input),
    getHdrJob: (jobId) => getHdrJob(pool, jobId),
    listHdrJobsForShoot: (shootId) => listHdrJobsForShoot(pool, shootId),
    listHdrJobsForBracketGroup: (groupId) => listHdrJobsForBracketGroup(pool, groupId),
    updateHdrJobStatus: (jobId, status) => updateHdrJobStatus(pool, jobId, status),
    listExportsForJob: (jobId) => listExportsForJob(pool, jobId),
    listExportsForShoot: (shootId) => listExportsForShoot(pool, shootId),
    getExport: (exportId) => getExport(pool, exportId),
    processHdrJob: (jobId) => {
      const runnerDeps: HdrJobRunnerDeps = {
        storage,
        localStorageRoot: env.LOCAL_STORAGE_ROOT,
        photomatixclPath: env.PHOTOMATIXCL_PATH,
        getHdrJob: (id) => getHdrJob(pool, id),
        getBracketGroupWithAssets: (groupId) => getBracketGroupWithAssets(pool, groupId),
        markHdrJobRunning: (id) => markHdrJobRunning(pool, id),
        markHdrJobSucceeded: (id, input) => markHdrJobSucceeded(pool, id, input),
        markHdrJobFailed: (id, input) => markHdrJobFailed(pool, id, input),
        createExport: (input) => createExport(pool, input),
        listExportsForJob: (id) => listExportsForJob(pool, id)
      };

      if (env.PHOTOMATIX_LICENSE_KEY) {
        runnerDeps.photomatixLicenseKey = env.PHOTOMATIX_LICENSE_KEY;
      }

      return processHdrJob(jobId, runnerDeps);
    }
  };
}
