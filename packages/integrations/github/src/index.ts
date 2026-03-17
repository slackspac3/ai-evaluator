import { createHmac, timingSafeEqual } from "crypto";

import { log } from "@ai-evaluator/logger";

export type GitHubWebhookEnvelope = {
  deliveryId: string;
  event: string;
  signature256: string;
  payload: Record<string, unknown>;
};

const CHANGE_PATTERNS = [/prompt/i, /promptfoo/i, /\.ya?ml$/i, /\.json$/i];
const PROMPTFOO_CONFIG_PATTERNS = [/^promptfooconfig\.ya?ml$/i, /^promptfooconfig\.json$/i, /promptfoo.*config.*\.ya?ml$/i];

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

function buildGitHubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "ai-evaluator"
  };
}

async function parseGitHubResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function listPullRequestFiles(input: {
  owner: string;
  repo: string;
  pullNumber: number;
  token: string;
}): Promise<string[]> {
  const files: string[] = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `https://api.github.com/repos/${input.owner}/${input.repo}/pulls/${input.pullNumber}/files?per_page=100&page=${page}`,
      {
        headers: buildGitHubHeaders(input.token)
      }
    );
    const payload = await parseGitHubResponse<Array<{ filename?: string }>>(response);
    if (payload.length === 0) {
      break;
    }

    files.push(...payload.map((item) => item.filename).filter((value): value is string => Boolean(value)));
    if (payload.length < 100) {
      break;
    }
    page += 1;
  }

  return files;
}

export async function fetchRepositoryFile(input: {
  owner: string;
  repo: string;
  path: string;
  ref: string;
  token: string;
}): Promise<string | null> {
  const response = await fetch(
    `https://api.github.com/repos/${input.owner}/${input.repo}/contents/${input.path}?ref=${encodeURIComponent(input.ref)}`,
    {
      headers: buildGitHubHeaders(input.token)
    }
  );

  if (response.status === 404) {
    return null;
  }

  const payload = await parseGitHubResponse<{ content?: string; encoding?: string }>(response);
  if (!payload.content) {
    return null;
  }

  if (payload.encoding === "base64") {
    return Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8");
  }

  return payload.content;
}

export function resolvePromptfooConfigPath(changedFiles: string[]): string {
  const changedConfig = changedFiles.find((file) => {
    const filename = file.split("/").pop() || file;
    return PROMPTFOO_CONFIG_PATTERNS.some((pattern) => pattern.test(filename));
  });

  return changedConfig || "promptfooconfig.yaml";
}
