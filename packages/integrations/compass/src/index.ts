import { getConfig } from "@ai-evaluator/config";

export type CompassProviderConfig = {
  baseUrl: string;
  model: string;
  apiKeyPresent: boolean;
};

export function getCompassProviderConfig(): CompassProviderConfig {
  const config = getConfig();
  return {
    baseUrl: config.COMPASS_API_BASE_URL,
    model: config.COMPASS_MODEL,
    apiKeyPresent: Boolean(config.COMPASS_API_KEY)
  };
}
