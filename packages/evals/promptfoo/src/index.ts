import type { PromptfooExecutionRequest, PromptfooExecutionResult } from "@ai-evaluator/types";

export function buildPromptfooCommand(input: PromptfooExecutionRequest, revision: "base" | "head"): string[] {
  return [
    "npx",
    "promptfoo",
    "eval",
    "--config",
    input.promptConfigPath,
    "--env",
    `REVISION=${revision}`,
    "--output",
    `artifacts/${input.repositoryFullName.replace("/", "_")}_${revision}.json`
  ];
}

export async function executePromptfooComparison(input: PromptfooExecutionRequest): Promise<PromptfooExecutionResult> {
  const changedPromptFiles = input.changedFiles.filter((file: string) => /prompt|promptfoo/i.test(file));
  const failedAssertions = changedPromptFiles.length > 0 ? 2 : 0;
  const totalAssertions = 8;

  return {
    status: failedAssertions > 0 ? "failed" : "passed",
    summary:
      failedAssertions > 0
        ? "Head revision regressed two prompt assertions compared with base."
        : "Head revision matched base across the selected promptfoo assertions.",
    logs: [
      `Prepared base command: ${buildPromptfooCommand(input, "base").join(" ")}`,
      `Prepared head command: ${buildPromptfooCommand(input, "head").join(" ")}`,
      "Promptfoo execution is stubbed in this scaffold and should be replaced with real CLI invocation."
    ],
    failedAssertions,
    totalAssertions,
    artifacts: [],
    cases: []
  };
}
