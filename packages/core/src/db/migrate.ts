import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPool } from "./pool";

export type MigrationFile = {
  filename: string;
  fullPath: string;
  sql: string;
};

function defaultMigrationsDirectory(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../../../../db/migrations");
}

export async function readMigrationFiles(
  migrationsDirectory = defaultMigrationsDirectory()
): Promise<MigrationFile[]> {
  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  return Promise.all(
    filenames.map(async (filename) => {
      const fullPath = path.join(migrationsDirectory, filename);
      return {
        filename,
        fullPath,
        sql: await readFile(fullPath, "utf8")
      };
    })
  );
}

export async function runMigrations(options: {
  databaseUrl?: string;
  migrationsDirectory?: string;
}): Promise<string[]> {
  const pool = createPool(options.databaseUrl);
  const client = await pool.connect();

  try {
    const applied: string[] = [];
    const migrations = await readMigrationFiles(options.migrationsDirectory);

    await client.query("begin");
    await client.query(
      "create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now())"
    );

    for (const migration of migrations) {
      const existing = await client.query<{ filename: string }>(
        "select filename from schema_migrations where filename = $1",
        [migration.filename]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        continue;
      }

      await client.query(migration.sql);
      await client.query("insert into schema_migrations (filename) values ($1)", [
        migration.filename
      ]);
      applied.push(migration.filename);
    }

    await client.query("commit");
    return applied;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function resetDatabase(options: {
  databaseUrl?: string;
  migrationsDirectory?: string;
}): Promise<string[]> {
  const pool = createPool(options.databaseUrl);

  try {
    await pool.query("drop schema public cascade");
    await pool.query("create schema public");
  } finally {
    await pool.end();
  }

  return runMigrations(options);
}
