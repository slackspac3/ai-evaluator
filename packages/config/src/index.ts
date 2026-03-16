import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  POSTGRES_URL: z.string().optional(),
  STORAGE_URL: z.string().optional(),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_CLIENT_ID: z.string().optional(),
  GITHUB_APP_CLIENT_SECRET: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  COMPASS_API_KEY: z.string().optional(),
  COMPASS_API_BASE_URL: z.string().url().default("https://api.core42.ai/v1"),
  COMPASS_MODEL: z.string().default("gpt-4.1"),
  ARTIFACTS_ROOT: z.string().default("./artifacts"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

export type AppConfig = z.infer<typeof configSchema>;
export type ConfigEnv = Record<string, string | undefined>;

let cachedConfig: AppConfig | null = null;

export function getConfig(env: ConfigEnv = process.env): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  cachedConfig = configSchema.parse(env);
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

export function getDatabaseUrl(env: ConfigEnv = process.env): string {
  const config = getConfig(env);
  const candidate = config.DATABASE_URL || config.POSTGRES_URL || config.STORAGE_URL;
  if (!candidate) {
    throw new Error("DATABASE_URL, POSTGRES_URL, or STORAGE_URL must be configured");
  }
  return candidate;
}
