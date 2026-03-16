import { NextResponse } from "next/server";

import { getIntegrationSettings } from "@/lib/data";

export async function GET() {
  return NextResponse.json(await getIntegrationSettings());
}

