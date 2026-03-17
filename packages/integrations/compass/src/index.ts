import { getConfig } from "@ai-evaluator/config";
import type { EvalRunRecord } from "@ai-evaluator/types";

export type CompassProviderConfig = {
  baseUrl: string;
  model: string;
  apiKeyPresent: boolean;
};

export type CompassChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function getCompassProviderConfig(): CompassProviderConfig {
  const config = getConfig();
  return {
    baseUrl: config.COMPASS_API_BASE_URL,
    model: config.COMPASS_MODEL,
    apiKeyPresent: Boolean(config.COMPASS_API_KEY)
  };
}

export async function callCompassChat(input: {
  messages: CompassChatMessage[];
  model?: string;
  temperature?: number;
}) {
  const config = getConfig();
  if (!config.COMPASS_API_KEY) {
    throw new Error("COMPASS_API_KEY is not configured.");
  }

  const response = await fetch(`${config.COMPASS_API_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.COMPASS_API_KEY}`
    },
    body: JSON.stringify({
      model: input.model || config.COMPASS_MODEL,
      temperature: input.temperature ?? 0.2,
      messages: input.messages
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Compass request failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<{
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  }>;
}

export async function summarizeAssessmentForExecutive(run: EvalRunRecord): Promise<string | null> {
  const provider = getCompassProviderConfig();
  if (!provider.apiKeyPresent) {
    return null;
  }

  const findingLines = run.cases.flatMap((evalCase) =>
    evalCase.assertions.map((assertion) => {
      return `Check: ${evalCase.description}\nStatus: ${assertion.status}\nMessage: ${assertion.message}\nOutput: ${assertion.output || "No output stored."}`;
    })
  );

  const evidence = findingLines.length > 0 ? findingLines.join("\n\n") : "No detailed case evidence was recorded.";

  const response = await callCompassChat({
    messages: [
      {
        role: "system",
        content:
          "You are an AI assurance analyst. Write a concise executive summary for a non-technical reviewer. Focus on risk posture, what matters, and what to do next. Use 3 short bullet-style sentences in plain English without markdown."
      },
      {
        role: "user",
        content: [
          `Assessment summary: ${run.summary}`,
          `Status: ${run.status}`,
          `Failed assertions: ${run.failedAssertions}`,
          `Total assertions: ${run.totalAssertions}`,
          `Changed files: ${run.changedFiles.join(", ") || "None"}`,
          `Evidence:\n${evidence}`
        ].join("\n")
      }
    ]
  });

  const content = response.choices?.[0]?.message?.content?.trim();
  return content || null;
}
