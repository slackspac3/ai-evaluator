import { getConfig } from "@ai-evaluator/config";
import { executePromptfooComparison } from "@ai-evaluator/evals-promptfoo";
import { EVAL_QUEUE_NAME } from "@ai-evaluator/jobs";
import { log } from "@ai-evaluator/logger";

async function main() {
  const config = getConfig();
  log("info", "worker boot", {
    queue: EVAL_QUEUE_NAME,
    redisUrl: config.REDIS_URL,
    compassBaseUrl: config.COMPASS_API_BASE_URL
  });

  const simulatedResult = await executePromptfooComparison({
    repositoryFullName: "slackspac3/ai-evaluator",
    baseSha: "abc123",
    headSha: "def456",
    changedFiles: ["prompts/support.yaml", "promptfooconfig.yaml"],
    promptConfigPath: "promptfooconfig.yaml"
  });

  log("info", "worker processed simulated eval", {
    status: simulatedResult.status,
    failedAssertions: simulatedResult.failedAssertions,
    totalAssertions: simulatedResult.totalAssertions
  });
}

main().catch((error: unknown) => {
  log("error", "worker crashed", {
    error: error instanceof Error ? error.message : "unknown error"
  });
  process.exit(1);
});

