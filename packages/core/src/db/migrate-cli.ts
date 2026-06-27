import { getRequiredEnv } from "../env/runtime-env";
import { resetDatabase, runMigrations } from "./migrate";

const command = process.argv[2] ?? "migrate";
const databaseUrl = getRequiredEnv("DATABASE_URL");

if (command === "reset" && process.env.CONFIRM_DB_RESET !== "structure-locked-hdr-service") {
  console.error(
    "Refusing to reset the database without CONFIRM_DB_RESET=structure-locked-hdr-service"
  );
  process.exit(1);
}

const applied =
  command === "reset"
    ? await resetDatabase({ databaseUrl })
    : await runMigrations({
        databaseUrl
      });

if (applied.length === 0) {
  console.log("No migrations to apply.");
} else {
  console.log(`Applied migrations: ${applied.join(", ")}`);
}
