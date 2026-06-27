import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const [, , command, ...args] = process.argv;

if (!command) {
  console.error("Usage: node scripts/run-with-local-env.mjs <command> [...args]");
  process.exit(1);
}

function unquote(value) {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value[value.length - 1];

  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(contents) {
  const parsed = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;
    const separatorIndex = normalized.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const name = normalized.slice(0, separatorIndex).trim();
    const value = normalized.slice(separatorIndex + 1).trim();

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      parsed[name] = unquote(value);
    }
  }

  return parsed;
}

const envPath = path.join(process.cwd(), ".env");
let localEnv = {};

try {
  localEnv = parseEnvFile(readFileSync(envPath, "utf8"));
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}

const child = spawn(command, args, {
  env: {
    ...localEnv,
    ...process.env
  },
  shell: false,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Command exited via signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
