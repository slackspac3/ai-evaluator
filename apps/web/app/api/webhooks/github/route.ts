import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "@ai-evaluator/config";
import { extractRelevantFiles, logWebhook, verifyGitHubSignature } from "@ai-evaluator/integrations-github";
import { executePromptfooComparison } from "@ai-evaluator/evals-promptfoo";
import { createEvalRun, recordWebhookDelivery, upsertPullRequest, upsertRepository } from "@/lib/data";

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

  const changedFiles = extractRelevantFiles(payload.changed_files || ["promptfooconfig.yaml"]);
  const accepted = changedFiles.length > 0;
  await recordWebhookDelivery({
    event,
    deliveryId,
    repositoryFullName,
    status: accepted ? "accepted" : "ignored",
      reason: accepted ? undefined : "No relevant prompt or config changes detected"
    });

  const [owner = "unknown", name = "unknown"] = repositoryFullName.split("/");
  const repository = await upsertRepository({
    id: payload.repository?.id ? `repo_${payload.repository.id}` : undefined,
    owner,
    name,
    fullName: repositoryFullName,
    defaultBranch: payload.repository?.default_branch || "main",
    installationId: payload.installation?.id ? String(payload.installation.id) : undefined
  });

  let pullRequestId: string | undefined;
  if (payload.pull_request?.number || payload.number) {
    const pullRequest = await upsertPullRequest({
      repositoryId: repository.id,
      githubPrNumber: payload.pull_request?.number || payload.number || 0,
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

  const result = await executePromptfooComparison({
    repositoryFullName,
    baseSha: payload.pull_request?.base?.sha || "base",
    headSha: payload.pull_request?.head?.sha || "head",
    changedFiles,
    promptConfigPath: "promptfooconfig.yaml",
    workingDirectory: process.cwd(),
    artifactsRoot: getConfig().ARTIFACTS_ROOT
  });
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
