export type RepositoryRecord = {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  installationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PullRequestRecord = {
  id: string;
  repositoryId: string;
  githubPrNumber: number;
  title: string;
  state: "open" | "closed" | "merged";
  baseSha: string;
  headSha: string;
  baseRef: string;
  headRef: string;
  authorLogin: string;
  changedFiles: string[];
  updatedAt: string;
};

export type EvalRunStatus = "queued" | "running" | "passed" | "failed" | "errored" | "skipped";

export type EvalAssertion = {
  id: string;
  caseId: string;
  provider: string;
  status: "pass" | "fail";
  score?: number;
  message: string;
  output: string;
};

export type EvalCase = {
  id: string;
  runId: string;
  description: string;
  provider: string;
  promptPath: string;
  assertions: EvalAssertion[];
};

export type ArtifactRecord = {
  id: string;
  runId: string;
  kind: "json" | "html" | "log" | "diff";
  path: string;
  sizeBytes: number;
  createdAt: string;
};

export type EvalRunRecord = {
  id: string;
  repositoryId: string;
  pullRequestId?: string;
  baseSha: string;
  headSha: string;
  status: EvalRunStatus;
  summary: string;
  failedAssertions: number;
  totalAssertions: number;
  changedFiles: string[];
  createdAt: string;
  updatedAt: string;
  logs: string[];
  artifacts: ArtifactRecord[];
  cases: EvalCase[];
};

export type WebhookDeliveryRecord = {
  id: string;
  event: string;
  deliveryId: string;
  repositoryFullName: string;
  status: "accepted" | "ignored" | "failed";
  reason?: string;
  receivedAt: string;
};

export type IntegrationSettings = {
  githubWebhookSecretConfigured: boolean;
  githubAppConfigured: boolean;
  compassBaseUrl: string;
  compassModel: string;
  artifactsRoot: string;
};

export type DashboardData = {
  repositories: RepositoryRecord[];
  recentRuns: EvalRunRecord[];
  recentDeliveries: WebhookDeliveryRecord[];
};

export type PromptfooExecutionRequest = {
  repositoryFullName: string;
  baseSha: string;
  headSha: string;
  changedFiles: string[];
  promptConfigPath: string;
};

export type PromptfooExecutionResult = {
  status: EvalRunStatus;
  summary: string;
  logs: string[];
  cases: EvalCase[];
  artifacts: ArtifactRecord[];
  failedAssertions: number;
  totalAssertions: number;
};

