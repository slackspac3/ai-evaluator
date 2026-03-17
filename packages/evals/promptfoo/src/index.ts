import { spawn } from "node:child_process";
import { access, mkdir, readFile, stat } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import os from "node:os";

import type { ArtifactRecord, PromptfooExecutionRequest, PromptfooExecutionResult } from "@ai-evaluator/types";

type PromptfooArtifactSpec = {
  jsonOutputPath: string;
  htmlOutputPath: string;
  logsPath: string;
};

type PromptfooBinaryResolution = {
  command: string[] | null;
  searchedPaths: string[];
};

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function toAbsolutePath(root: string, candidate: string): string {
  return path.isAbsolute(candidate) ? candidate : path.resolve(root, candidate);
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function statSize(targetPath: string): Promise<number> {
  try {
    const result = await stat(targetPath);
    return result.size;
  } catch {
    return 0;
  }
}

function buildArtifactsSpec(input: PromptfooExecutionRequest): PromptfooArtifactSpec {
  const configuredRoot = input.artifactsRoot || path.join(os.tmpdir(), "ai-evaluator-artifacts");
  const root = path.isAbsolute(configuredRoot) ? configuredRoot : path.join(os.tmpdir(), configuredRoot);
  const runSlug = `${sanitizeSegment(input.repositoryFullName)}_${sanitizeSegment(input.baseSha)}_${sanitizeSegment(input.headSha)}`;
  return {
    jsonOutputPath: path.join(root, `${runSlug}.json`),
    htmlOutputPath: path.join(root, `${runSlug}.html`),
    logsPath: path.join(root, `${runSlug}.log`)
  };
}

async function ensureArtifactsRoot(input: PromptfooExecutionRequest): Promise<PromptfooArtifactSpec> {
  const preferred = buildArtifactsSpec(input);
  try {
    await mkdir(path.dirname(preferred.jsonOutputPath), { recursive: true });
    return preferred;
  } catch {
    const fallback = buildArtifactsSpec({
      ...input,
      artifactsRoot: path.join(os.tmpdir(), "ai-evaluator-artifacts")
    });
    await mkdir(path.dirname(fallback.jsonOutputPath), { recursive: true });
    return fallback;
  }
}

async function resolvePromptfooConfigPath(input: PromptfooExecutionRequest): Promise<string | null> {
  const root = input.workingDirectory || process.cwd();
  const directCandidate = toAbsolutePath(root, input.promptConfigPath);
  if (await fileExists(directCandidate)) {
    return directCandidate;
  }

  const fallbackCandidates = [
    path.join(root, "promptfooconfig.yaml"),
    path.join(root, "promptfooconfig.yml"),
    path.join(root, "promptfooconfig.json")
  ];
  for (const candidate of fallbackCandidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function resolvePromptfooBinary(baseDirectory: string): Promise<PromptfooBinaryResolution> {
  const searchedPaths: string[] = [];
  let current = baseDirectory;

  for (let depth = 0; depth < 6; depth += 1) {
    const binCandidate = path.join(current, "node_modules", ".bin", "promptfoo");
    const jsCandidate = path.join(current, "node_modules", "promptfoo", "dist", "src", "main.js");
    searchedPaths.push(binCandidate, jsCandidate);
    if (await fileExists(binCandidate)) {
      return { command: [binCandidate], searchedPaths };
    }
    if (await fileExists(jsCandidate)) {
      return { command: ["node", jsCandidate], searchedPaths };
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return { command: null, searchedPaths };
}

export function buildPromptfooCommand(
  input: PromptfooExecutionRequest,
  revision: "base" | "head",
  configPath = input.promptConfigPath,
  outputPath?: string,
  binaryCommand: string[] = ["npx", "--no-install", "promptfoo"]
): string[] {
  const command = [
    ...binaryCommand,
    "eval",
    "--config",
    configPath,
    "--var",
    `REVISION=${revision}`
  ];

  if (outputPath) {
    command.push("--output", outputPath);
  }

  return command;
}

function findNumberDeep(value: unknown, keys: string[]): number | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNumberDeep(item, keys);
      if (typeof found === "number") {
        return found;
      }
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (keys.includes(key) && typeof child === "number") {
      return child;
    }
    const found = findNumberDeep(child, keys);
    if (typeof found === "number") {
      return found;
    }
  }
  return undefined;
}

function deriveSummary(status: PromptfooExecutionResult["status"], failedAssertions: number, totalAssertions: number): string {
  if (status === "skipped") {
    return "Promptfoo execution was skipped because the config file or runtime dependency was unavailable.";
  }
  if (status === "errored") {
    return "Promptfoo execution failed before assertions could be fully evaluated.";
  }
  if (failedAssertions > 0) {
    return `Promptfoo reported ${failedAssertions} failing assertions out of ${totalAssertions || "an unknown number of"} checks.`;
  }
  return `Promptfoo completed successfully with ${totalAssertions} passing assertions.`;
}

function normalizeArtifacts(spec: PromptfooArtifactSpec): ArtifactRecord[] {
  return [
    { id: "", runId: "", kind: "json", path: spec.jsonOutputPath, sizeBytes: 0, createdAt: "" },
    { id: "", runId: "", kind: "log", path: spec.logsPath, sizeBytes: 0, createdAt: "" }
  ];
}

function parsePromptfooOutput(raw: unknown, fallbackStatus: PromptfooExecutionResult["status"]): Pick<
  PromptfooExecutionResult,
  "failedAssertions" | "totalAssertions" | "summary"
> {
  const totalAssertions =
    findNumberDeep(raw, ["total", "tests", "totalTests", "assertions", "totalAssertions"]) ?? 0;
  const failedAssertions =
    findNumberDeep(raw, ["failures", "failed", "failedTests", "failedAssertions"]) ?? 0;

  return {
    failedAssertions,
    totalAssertions,
    summary: deriveSummary(fallbackStatus, failedAssertions, totalAssertions)
  };
}

async function runCommand(command: string[], options: { cwd: string; env: NodeJS.ProcessEnv }): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr
      });
    });
  });
}

async function isPromptfooAvailable(workingDirectory: string): Promise<boolean> {
  const resolution = await resolvePromptfooBinary(process.cwd());
  const binaryCommand = resolution.command || ["npx", "--no-install", "promptfoo"];
  try {
    const result = await runCommand([...binaryCommand, "--version"], {
      cwd: workingDirectory,
      env: process.env
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

export async function executePromptfooComparison(input: PromptfooExecutionRequest): Promise<PromptfooExecutionResult> {
  const workingDirectory = input.workingDirectory || process.cwd();
  const configPath = await resolvePromptfooConfigPath(input);
  const artifactsSpec = await ensureArtifactsRoot(input);
  const binaryResolution = await resolvePromptfooBinary(process.cwd());
  const binaryCommand = binaryResolution.command || ["npx", "--no-install", "promptfoo"];

  if (!configPath) {
    return {
      status: "skipped",
      summary: "Promptfoo execution was skipped because no promptfoo config file was found for this repository snapshot.",
      logs: [
        `Checked working directory: ${workingDirectory}`,
        `Expected config path: ${input.promptConfigPath}`,
        "No promptfoo config file was found, so the run was persisted without execution."
      ],
      cases: [],
      artifacts: [],
      failedAssertions: 0,
      totalAssertions: 0
    };
  }

  if (!(await isPromptfooAvailable(workingDirectory))) {
    return {
      status: "skipped",
      summary: "Promptfoo execution was skipped because the promptfoo CLI is not installed in the runtime environment.",
      logs: [
        `Working directory: ${workingDirectory}`,
        `Promptfoo config: ${configPath}`,
        `Expected binary command: ${binaryCommand.join(" ")}`,
        `Searched promptfoo paths: ${binaryResolution.searchedPaths.join(", ")}`,
        "Install promptfoo in the runtime environment before enabling live evaluations."
      ],
      cases: [],
      artifacts: [],
      failedAssertions: 0,
      totalAssertions: 0
    };
  }

  const command = buildPromptfooCommand(input, "head", configPath, artifactsSpec.jsonOutputPath, binaryCommand);

  try {
    const runResult = await runCommand(command, {
      cwd: workingDirectory,
      env: {
        ...process.env,
        REVISION: "head",
        BASE_SHA: input.baseSha,
        HEAD_SHA: input.headSha
      }
    });

    let status: PromptfooExecutionResult["status"] = runResult.exitCode === 0 ? "passed" : "failed";
    let failedAssertions = runResult.exitCode === 0 ? 0 : 1;
    let totalAssertions = runResult.exitCode === 0 ? 1 : 0;
    let summary = deriveSummary(status, failedAssertions, totalAssertions);

    if (await fileExists(artifactsSpec.jsonOutputPath)) {
      try {
        const parsed = JSON.parse(await readFile(artifactsSpec.jsonOutputPath, "utf8")) as unknown;
        const normalized = parsePromptfooOutput(parsed, status);
        failedAssertions = normalized.failedAssertions;
        totalAssertions = normalized.totalAssertions;
        summary = normalized.summary;
        if (failedAssertions > 0) {
          status = "failed";
        }
      } catch {
        summary = "Promptfoo completed but the JSON artifact could not be parsed into normalized counts.";
      }
    }

    const artifactSpecs = normalizeArtifacts(artifactsSpec);
    const artifacts: ArtifactRecord[] = [];
    for (const artifact of artifactSpecs) {
      if (await fileExists(artifact.path)) {
        artifacts.push({
          ...artifact,
          sizeBytes: await statSize(artifact.path)
        });
      }
    }

    const logs = [
      `Working directory: ${workingDirectory}`,
      `Promptfoo config: ${configPath}`,
      `Command: ${command.join(" ")}`,
      runResult.stdout.trim(),
      runResult.stderr.trim()
    ].filter(Boolean);

    return {
      status,
      summary,
      logs,
      cases: [],
      artifacts,
      failedAssertions,
      totalAssertions
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown promptfoo execution error";
    return {
      status: "errored",
      summary: "Promptfoo execution errored before completion.",
      logs: [
        `Working directory: ${workingDirectory}`,
        `Promptfoo config: ${configPath}`,
        `Command: ${command.join(" ")}`,
        `Error: ${message}`
      ],
      cases: [],
      artifacts: [],
      failedAssertions: 0,
      totalAssertions: 0
    };
  }
}
