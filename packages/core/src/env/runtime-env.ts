import { z } from "zod";

export const runtimeEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  ADMIN_SESSION_SECRET: z.string().min(32),
  API_KEY: z.string().min(1),
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  LOCAL_STORAGE_ROOT: z.string().min(1).default("/data/storage"),
  PHOTOMATIX_LICENSE_KEY: z.string().optional().default("")
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

export function parseRuntimeEnv(env: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  return runtimeEnvSchema.parse(env);
}

export function getRequiredEnv(
  name: keyof RuntimeEnv,
  env: NodeJS.ProcessEnv = process.env
): string {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}
