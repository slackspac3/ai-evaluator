import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getConfig } from "@ai-evaluator/config";
import { claimNextQueuedRun, getRepositoryById, updateEvalRunResult } from "@ai-evaluator/db";
import { executePromptfooComparison } from "@ai-evaluator/evals-promptfoo";
import { fetchRepositoryFile, resolvePromptfooConfigPath } from "@ai-evaluator/integrations-github";
import { EVAL_QUEUE_NAME } from "@ai-evaluator/jobs";
import { log } from "@ai-evaluator/logger";
import type { EvalRunRecord, PromptfooExecutionResult } from "@ai-evaluator/types";

async function createPromptfooWorkspace(input: {
  owner: string;
  repo: string;
  headRef: string;
  token?: string;
  changedFiles: string[];
}): Promise<{ workingDirectory?: string; promptConfigPath: string; logs: string[] }> {
  const promptConfigPath = resolvePromptfooConfigPath(input.changedFiles);
  if (!input.token) {
    return {
      promptConfigPath,
      logs: ["GITHUB_TOKEN is not configured, so the worker could not fetch PR files from GitHub."]
    };
  }

  const filesToFetch = Array.from(new Set([promptConfigPath, ...input.changedFiles]));
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "ai-evaluator-worker-"));
  const logs: string[] = [`Created temporary workspace: ${workspaceRoot}`];

  for (const filePath of filesToFetch) {
    const content = await fetchRepositoryFile({
      owner: input.owner,
      repo: input.repo,
      path: filePath,
      ref: input.headRef,
      token: input.token
    });

    if (content === null) {
      logs.push(`Skipped missing file at head revision: ${filePath}`);
      continue;
    }

    const absolutePath = path.join(workspaceRoot, filePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
    logs.push(`Fetched file from GitHub: ${filePath}`);
  }

  return {
    workingDirectory: workspaceRoot,
    promptConfigPath,
    logs
  };
}

async function processRun(run: EvalRunRecord): Promise<void> {
  const config = getConfig();
  const repository = await getRepositoryById(run.repositoryId);
  if (!repository) {
    await updateEvalRunResult({
      runId: run.id,
      result: {
        status: "errored",
        summary: "Worker could not load repository metadata for this run.",
        logs: [`Missing repository for run ${run.id}`],
        cases: [],
        artifacts: [],
        failedAssertions: 0,
        totalAssertions: 0
      }
    });
    return;
  }

  const [owner, repo] = repository.fullName.split("/");
  const workspace = await createPromptfooWorkspace({
    owner,
    repo,
    headRef: run.headSha,
    token: config.GITHUB_TOKEN,
    changedFiles: run.changedFiles
  });

  const result = await executePromptfooComparison({
    repositoryFullName: repository.fullName,
    baseSha: run.baseSha,
    headSha: run.headSha,
    changedFiles: run.changedFiles,
    promptConfigPath: workspace.promptConfigPath,
    workingDirectory: workspace.workingDirectory || process.cwd(),
    artifactsRoot: config.ARTIFACTS_ROOT
  });

  const enrichedResult: PromptfooExecutionResult = {
    ...result,
    logs: [...workspace.logs, ...result.logs]
  };

  await updateEvalRunResult({
    runId: run.id,
    result: enrichedResult
  });

  log("info", "worker processed queued eval", {
    runId: run.id,
    status: enrichedResult.status,
    failedAssertions: enrichedResult.failedAssertions,
    totalAssertions: enrichedResult.totalAssertions
  });
}

async function main() {
  const config = getConfig();
  const pollMs = Number(process.env.WORKER_POLL_MS || 10000);

  log("info", "worker boot", {
    queue: EVAL_QUEUE_NAME,
    redisUrl: config.REDIS_URL,
    compassBaseUrl: config.COMPASS_API_BASE_URL,
    pollMs
  });

  while (true) {
    const run = await claimNextQueuedRun();
    if (!run) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      continue;
    }

    try {
      await processRun(run);
    } catch (error) {
      await updateEvalRunResult({
        runId: run.id,
        result: {
          status: "errored",
          summary: "Worker failed while processing the queued run.",
          logs: [error instanceof Error ? error.message : "Unknown worker error"],
          cases: [],
          artifacts: [],
          failedAssertions: 0,
          totalAssertions: 0
        }
      });
    }
  }
}

main().catch((error: unknown) => {
  log("error", "worker crashed", {
    error: error instanceof Error ? error.message : "unknown error"
  });
  process.exit(1);
});
