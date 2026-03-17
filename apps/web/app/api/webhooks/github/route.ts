import { NextRequest, NextResponse } from "next/server";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getConfig } from "@ai-evaluator/config";
import {
  extractRelevantFiles,
  fetchRepositoryFile,
  listPullRequestFiles,
  logWebhook,
  resolvePromptfooConfigPath,
  verifyGitHubSignature
} from "@ai-evaluator/integrations-github";
import { executePromptfooComparison } from "@ai-evaluator/evals-promptfoo";
import { createEvalRun, recordWebhookDelivery, upsertPullRequest, upsertRepository } from "@/lib/data";

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
      logs: ["GITHUB_TOKEN is not configured, so the app could not fetch PR files from GitHub."]
    };
  }

  const filesToFetch = Array.from(new Set([promptConfigPath, ...input.changedFiles]));
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "ai-evaluator-pr-"));
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

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const event = request.headers.get("x-github-event") || "unknown";
  const deliveryId = request.headers.get("x-github-delivery") || "missing";
  const signature256 = request.headers.get("x-hub-signature-256") || "";
  const secret = getConfig().GITHUB_WEBHOOK_SECRET;
  const payload = JSON.parse(rawBody) as {
    action?: string;
    number?: number;
    repository?: {
      id?: number;
      full_name?: string;
      name?: string;
      owner?: { login?: string };
      default_branch?: string;
    };
    installation?: { id?: number };
    pull_request?: {
      number?: number;
      title?: string;
      state?: "open" | "closed";
      user?: { login?: string };
      base?: { sha?: string; ref?: string };
      head?: { sha?: string; ref?: string };
      changed_files?: number;
    };
    changed_files?: string[];
  };
  const repositoryFullName = payload.repository?.full_name || "unknown/unknown";

  if (!secret) {
    await recordWebhookDelivery({
      event,
      deliveryId,
      repositoryFullName,
      status: "failed",
      reason: "GitHub webhook secret is not configured"
    });
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  if (!verifyGitHubSignature(rawBody, signature256, secret)) {
    await recordWebhookDelivery({
      event,
      deliveryId,
      repositoryFullName,
      status: "failed",
      reason: "Invalid webhook signature"
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  logWebhook(event, repositoryFullName, deliveryId);

  const config = getConfig();
  const [owner = "unknown", name = "unknown"] = repositoryFullName.split("/");
  const prNumber = payload.pull_request?.number || payload.number;

  let sourceChangedFiles = payload.changed_files || ["promptfooconfig.yaml"];
  if (config.GITHUB_TOKEN && prNumber) {
    try {
      sourceChangedFiles = await listPullRequestFiles({
        owner,
        repo: name,
        pullNumber: prNumber,
        token: config.GITHUB_TOKEN
      });
    } catch (error) {
      await recordWebhookDelivery({
        event,
        deliveryId,
        repositoryFullName,
        status: "failed",
        reason: error instanceof Error ? `GitHub PR file sync failed: ${error.message}` : "GitHub PR file sync failed"
      });
      return NextResponse.json({ error: "Failed to sync pull request files from GitHub" }, { status: 502 });
    }
  }

  const changedFiles = extractRelevantFiles(sourceChangedFiles);
  const accepted = changedFiles.length > 0;
  await recordWebhookDelivery({
    event,
    deliveryId,
    repositoryFullName,
    status: accepted ? "accepted" : "ignored",
      reason: accepted ? undefined : "No relevant prompt or config changes detected"
    });

  const repository = await upsertRepository({
    id: payload.repository?.id ? `repo_${payload.repository.id}` : undefined,
    owner,
    name,
    fullName: repositoryFullName,
    defaultBranch: payload.repository?.default_branch || "main",
    installationId: payload.installation?.id ? String(payload.installation.id) : undefined
  });

  let pullRequestId: string | undefined;
  if (prNumber) {
    const pullRequest = await upsertPullRequest({
      repositoryId: repository.id,
      githubPrNumber: prNumber,
      title: payload.pull_request?.title || `${event} event`,
      state: payload.pull_request?.state === "closed" ? "closed" : "open",
      baseSha: payload.pull_request?.base?.sha || "base",
      headSha: payload.pull_request?.head?.sha || "head",
      baseRef: payload.pull_request?.base?.ref || "main",
      headRef: payload.pull_request?.head?.ref || "head",
      authorLogin: payload.pull_request?.user?.login || owner,
      changedFiles
    });
    pullRequestId = pullRequest.id;
  }

  const workspace = accepted
    ? await createPromptfooWorkspace({
        owner,
        repo: name,
        headRef: payload.pull_request?.head?.sha || "head",
        token: config.GITHUB_TOKEN,
        changedFiles
      })
    : { promptConfigPath: "promptfooconfig.yaml", logs: [] as string[] };

  const result = await executePromptfooComparison({
    repositoryFullName,
    baseSha: payload.pull_request?.base?.sha || "base",
    headSha: payload.pull_request?.head?.sha || "head",
    changedFiles,
    promptConfigPath: workspace.promptConfigPath,
    workingDirectory: workspace.workingDirectory || process.cwd(),
    artifactsRoot: config.ARTIFACTS_ROOT
  });
  result.logs = [...workspace.logs, ...result.logs];
  const run = accepted
    ? await createEvalRun({
        repositoryId: repository.id,
        pullRequestId,
        baseSha: payload.pull_request?.base?.sha || "base",
        headSha: payload.pull_request?.head?.sha || "head",
        changedFiles,
        result
      })
    : null;

  return NextResponse.json({
    accepted,
    changedFiles,
    repositoryId: repository.id,
    pullRequestId,
    runId: run?.id,
    result
  });
}
