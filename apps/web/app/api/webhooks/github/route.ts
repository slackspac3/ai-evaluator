import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "@ai-evaluator/config";
import { extractRelevantFiles, logWebhook, verifyGitHubSignature } from "@ai-evaluator/integrations-github";
import { executePromptfooComparison } from "@ai-evaluator/evals-promptfoo";
import { recordWebhookDelivery } from "@/lib/data";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const event = request.headers.get("x-github-event") || "unknown";
  const deliveryId = request.headers.get("x-github-delivery") || "missing";
  const signature256 = request.headers.get("x-hub-signature-256") || "";
  const secret = getConfig().GITHUB_WEBHOOK_SECRET;
  const payload = JSON.parse(rawBody) as {
    repository?: { full_name?: string };
    pull_request?: { base?: { sha?: string }; head?: { sha?: string }; changed_files?: number };
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
  const result = await executePromptfooComparison({
    repositoryFullName,
    baseSha: payload.pull_request?.base?.sha || "base",
    headSha: payload.pull_request?.head?.sha || "head",
    changedFiles,
    promptConfigPath: "promptfooconfig.yaml"
  });

  return NextResponse.json({
    accepted,
    changedFiles,
    result
  });
}
