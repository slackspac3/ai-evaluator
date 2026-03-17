import { NextRequest, NextResponse } from "next/server";

import { callCompassChat } from "@ai-evaluator/integrations-compass";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
      model?: string;
      temperature?: number;
    };

    if (!body.messages || body.messages.length === 0) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
    }

    const response = await callCompassChat({
      messages: body.messages,
      model: body.model,
      temperature: body.temperature
    });

    return NextResponse.json(response, {
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Compass proxy failed." },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
