import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "@ai-evaluator/config";
import {
  extractPushChangedFiles,
  extractRelevantFiles,
  listPullRequestFiles,
  logWebhook,
  verifyGitHubSignature
} from "@ai-evaluator/integrations-github";
import { createQueuedEvalRun, recordWebhookDelivery, upsertPullRequest, upsertRepository } from "@/lib/data";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const event = request.headers.get("x-github-event") || "unknown";
  const deliveryId = request.headers.get("x-github-delivery") || "missing";
  const signature256 = request.headers.get("x-hub-signature-256") || "";
  const secret = getConfig().GITHUB_WEBHOOK_SECRET;

  try {
    const payload = JSON.parse(rawBody) as {
      action?: string;
      number?: number;
      repository?: {
        id?: number;
        full_name?: string;
        name?: string;
        owner?: { login?: string; name?: string };
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
      commits?: Array<{
        added?: string[];
        modified?: string[];
        removed?: string[];
      }>;
      before?: string;
      after?: string;
      ref?: string;
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
    const resolvedOwner = payload.repository?.owner?.login || payload.repository?.owner?.name || owner;
    const prNumber = payload.pull_request?.number || payload.number;

    let sourceChangedFiles =
      event === "push" ? extractPushChangedFiles(payload.commits || []) : payload.changed_files || ["promptfooconfig.yaml"];
    if (config.GITHUB_TOKEN && prNumber) {
      try {
        sourceChangedFiles = await listPullRequestFiles({
          owner: resolvedOwner,
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

    if (event !== "pull_request" && event !== "push") {
      return NextResponse.json({
        accepted: false,
        ignored: true,
        reason: `Unsupported webhook event: ${event}`
      });
    }

    const repository = await upsertRepository({
      id: payload.repository?.id ? `repo_${payload.repository.id}` : undefined,
      owner: resolvedOwner,
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
        authorLogin: payload.pull_request?.user?.login || resolvedOwner,
        changedFiles
      });
      pullRequestId = pullRequest.id;
    }

    const headRef = payload.pull_request?.head?.sha || payload.after || "head";
    const baseRef = payload.pull_request?.base?.sha || payload.before || "base";

    const run = accepted
      ? await createQueuedEvalRun({
          repositoryId: repository.id,
          pullRequestId,
          baseSha: baseRef,
          headSha: headRef,
          changedFiles,
          summary: "Queued for local worker execution.",
          logs: [
            `Webhook accepted for ${repositoryFullName}.`,
            `Queued on event: ${event}.`,
            `Base revision: ${baseRef}`,
            `Head revision: ${headRef}`
          ]
        })
      : null;

    return NextResponse.json({
      accepted,
      changedFiles,
      repositoryId: repository.id,
      pullRequestId,
      runId: run?.id,
      status: run?.status ?? "ignored"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled webhook processing error";
    const repositoryFullName = "unknown/unknown";
    await recordWebhookDelivery({
      event,
      deliveryId,
      repositoryFullName,
      status: "failed",
      reason: message
    }).catch(() => undefined);
    return NextResponse.json({ error: "Unhandled webhook processing error", detail: message }, { status: 500 });
  }
}
