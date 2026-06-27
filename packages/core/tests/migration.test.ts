import { describe, expect, it } from "vitest";
import { readMigrationFiles } from "../src/index";

describe("phase 1 migration smoke test", () => {
  it("contains the required tables and useful indexes", async () => {
    const migrations = await readMigrationFiles();
    const sql = migrations.map((migration) => migration.sql).join("\n");

    expect(migrations.map((migration) => migration.filename)).toEqual(["001_phase_1_schema.sql"]);

    for (const table of [
      "shoots",
      "upload_batches",
      "assets",
      "bracket_groups",
      "bracket_group_assets",
      "hdr_jobs",
      "exports",
      "job_events",
      "api_keys"
    ]) {
      expect(sql).toContain(`create table ${table}`);
    }

    for (const index of [
      "shoots_created_at_idx",
      "assets_shoot_id_idx",
      "bracket_groups_shoot_id_idx",
      "hdr_jobs_shoot_id_idx",
      "hdr_jobs_status_idx",
      "exports_hdr_job_id_idx",
      "job_events_hdr_job_id_idx"
    ]) {
      expect(sql).toContain(`create index ${index}`);
    }
  });
});
