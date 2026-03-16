import { getConfig } from "@ai-evaluator/config";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export function log(level: LogLevel, message: string, context: Record<string, unknown> = {}): void {
  const configuredLevel = getConfig().LOG_LEVEL;
  if (levelWeight[level] < levelWeight[configuredLevel]) {
    return;
  }
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context
  };
  console.log(JSON.stringify(payload));
}
