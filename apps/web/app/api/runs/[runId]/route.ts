import { NextResponse } from "next/server";

import { getRunById } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await getRunById(runId);
  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(run);
}

