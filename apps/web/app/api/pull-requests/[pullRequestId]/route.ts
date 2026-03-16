import { NextResponse } from "next/server";

import { getPullRequestById, listRuns } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ pullRequestId: string }> }) {
  const { pullRequestId } = await params;
  const pullRequest = await getPullRequestById(pullRequestId);
  if (!pullRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const runs = await listRuns({ pullRequestId });
  return NextResponse.json({ pullRequest, runs });
}

