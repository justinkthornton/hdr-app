import {
  createShoot,
  getPool,
  getShoot,
  listShoots,
  updateShoot
} from "@structure-locked-hdr/core";
import type { ShootRouteDeps } from "./shoot-route-handlers";

export function makeShootDeps(): ShootRouteDeps {
  const pool = getPool();

  return {
    listShoots: () => listShoots(pool),
    createShoot: (input) => createShoot(pool, input),
    getShoot: (shootId) => getShoot(pool, shootId),
    updateShoot: (shootId, input) => updateShoot(pool, shootId, input)
  };
}
