import { z } from "zod";
const configSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    GITHUB_WEBHOOK_SECRET: z.string().min(1),
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_APP_PRIVATE_KEY: z.string().optional(),
    GITHUB_APP_CLIENT_ID: z.string().optional(),
    GITHUB_APP_CLIENT_SECRET: z.string().optional(),
    GITHUB_TOKEN: z.string().optional(),
    COMPASS_API_KEY: z.string().min(1),
    COMPASS_API_BASE_URL: z.string().url().default("https://api.core42.ai/v1"),
    COMPASS_MODEL: z.string().default("gpt-4.1"),
    ARTIFACTS_ROOT: z.string().default("./artifacts"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});
let cachedConfig = null;
export function getConfig(env = process.env) {
    if (cachedConfig) {
        return cachedConfig;
    }
    cachedConfig = configSchema.parse(env);
    return cachedConfig;
}
