import { NextRequest, NextResponse } from "next/server";

import { createQueuedEvalRun, getRunById, listPullRequests, listRepositories } from "@/lib/data";

function formatChoice(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}

async function createDemoRun(request: NextRequest) {
  const repositories = await listRepositories();
  const repository = repositories[0];
  if (!repository) {
    return NextResponse.json({ error: "No repository is available for a demo run." }, { status: 404 });
  }

  const pullRequests = await listPullRequests(repository.id);
  const pullRequest = pullRequests[0];
  const run = await createQueuedEvalRun({
    repositoryId: repository.id,
    pullRequestId: pullRequest?.id,
    baseSha: pullRequest?.baseSha || "demo-base",
    headSha: pullRequest?.headSha || "demo-head",
    changedFiles: pullRequest?.changedFiles || ["promptfooconfig.yaml", "prompts/support-assistant.txt"],
    summary: "Queued sample assessment from the portal.",
    logs: [
      "This run was started manually from the dashboard.",
      "The local worker will pick it up automatically."
    ]
  });

  return NextResponse.redirect(new URL(`/runs/${run.id}`, request.url));
}

async function createGuidedRun(request: NextRequest) {
  const repositories = await listRepositories();
  const repository = repositories[0];
  if (!repository) {
    return NextResponse.json({ error: "No repository is available for a guided assessment." }, { status: 404 });
  }

  const pullRequests = await listPullRequests(repository.id);
  const pullRequest = pullRequests[0];
  const systemType = request.nextUrl.searchParams.get("systemType") || "customer-support-chatbot";
  const reportType = request.nextUrl.searchParams.get("reportType") || "both";
  const concerns = request.nextUrl.searchParams.getAll("concern");
  const selectedConcerns = concerns.length > 0 ? concerns : ["security"];

  const concernLabel = selectedConcerns.map(formatChoice).join(", ");
  const systemLabel = formatChoice(systemType);
  const reportLabel = formatChoice(reportType);

  const run = await createQueuedEvalRun({
    repositoryId: repository.id,
    pullRequestId: pullRequest?.id,
    baseSha: pullRequest?.baseSha || "guided-base",
    headSha: pullRequest?.headSha || "guided-head",
    changedFiles: pullRequest?.changedFiles || ["promptfooconfig.yaml", "prompts/support-assistant.txt"],
    summary: `Queued ${concernLabel} assessment for a ${systemLabel}.`,
    logs: [
      "This run was started from the guided assessment wizard.",
      `Requested focus areas: ${concernLabel}.`,
      `Requested report type: ${reportLabel}.`,
      "The local worker will pick it up automatically."
    ]
  });

  return NextResponse.redirect(new URL(`/runs/${run.id}`, request.url));
}

async function rerunExistingRun(request: NextRequest, runId: string) {
  const existingRun = await getRunById(runId);
  if (!existingRun) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const run = await createQueuedEvalRun({
    repositoryId: existingRun.repositoryId,
    pullRequestId: existingRun.pullRequestId,
    baseSha: existingRun.baseSha,
    headSha: existingRun.headSha,
    changedFiles: existingRun.changedFiles,
    summary: "Queued from the portal for a re-check.",
    logs: [
      `This run was re-queued from ${existingRun.id}.`,
      "The local worker will pick it up automatically."
    ]
  });

  return NextResponse.redirect(new URL(`/runs/${run.id}`, request.url));
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode");
  if (mode === "demo") {
    return createDemoRun(request);
  }

  if (mode === "guided") {
    return createGuidedRun(request);
  }

  if (mode === "rerun") {
    const runId = request.nextUrl.searchParams.get("runId");
    if (!runId) {
      return NextResponse.json({ error: "runId is required for rerun mode." }, { status: 400 });
    }
    return rerunExistingRun(request, runId);
  }

  return NextResponse.json({ error: "Unsupported manual run mode." }, { status: 400 });
}
