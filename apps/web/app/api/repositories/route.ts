import { NextResponse } from "next/server";

import { listRepositories } from "@/lib/data";

export async function GET() {
  return NextResponse.json(await listRepositories());
}

