import { createHmac, timingSafeEqual } from "crypto";

import { log } from "@ai-evaluator/logger";

export type GitHubWebhookEnvelope = {
  deliveryId: string;
  event: string;
  signature256: string;
  payload: Record<string, unknown>;
};

const CHANGE_PATTERNS = [/prompt/i, /promptfoo/i, /\.ya?ml$/i, /\.json$/i];

export function verifyGitHubSignature(rawBody: string, signature256: string, secret: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const left = Buffer.from(expected);
  const right = Buffer.from(signature256 || "");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function extractRelevantFiles(changedFiles: string[]): string[] {
  return changedFiles.filter((file) => CHANGE_PATTERNS.some((pattern) => pattern.test(file)));
}

export function buildWebhookSummary(event: string, repositoryFullName: string): string {
  return `${event} webhook received for ${repositoryFullName}`;
}

export function logWebhook(event: string, repositoryFullName: string, deliveryId: string): void {
  log("info", "github webhook received", { event, repositoryFullName, deliveryId });
}
