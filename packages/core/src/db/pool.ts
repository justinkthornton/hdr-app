import pg from "pg";
import { getRequiredEnv } from "../env/runtime-env";

const { Pool } = pg;

let sharedPool: pg.Pool | null = null;

export type Queryable = Pick<pg.Pool | pg.PoolClient, "query">;

export function createPool(databaseUrl = getRequiredEnv("DATABASE_URL")): pg.Pool {
  return new Pool({
    connectionString: databaseUrl
  });
}

export function getPool(): pg.Pool {
  if (!sharedPool) {
    sharedPool = createPool();
  }

  return sharedPool;
}

export async function closePool(): Promise<void> {
  if (sharedPool) {
    await sharedPool.end();
    sharedPool = null;
  }
}
