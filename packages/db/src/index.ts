import type {
  DashboardData,
  EvalRunRecord,
  IntegrationSettings,
  PullRequestRecord,
  RepositoryRecord,
  WebhookDeliveryRecord
} from "@ai-evaluator/types";

function now(): string {
  return new Date().toISOString();
}

const repositories: RepositoryRecord[] = [
  {
    id: "repo_demo",
    owner: "slackspac3",
    name: "ai-evaluator",
    fullName: "slackspac3/ai-evaluator",
    defaultBranch: "main",
    createdAt: now(),
    updatedAt: now()
  }
];

const pullRequests: PullRequestRecord[] = [
  {
    id: "pr_42",
    repositoryId: "repo_demo",
    githubPrNumber: 42,
    title: "Tune support assistant prompts",
    state: "open",
    baseSha: "abc123",
    headSha: "def456",
    baseRef: "main",
    headRef: "feature/pr-tune",
    authorLogin: "slackspac3",
    changedFiles: ["prompts/support.yaml", "promptfooconfig.yaml"],
    updatedAt: now()
  }
];

const runs: EvalRunRecord[] = [
  {
    id: "run_demo_1",
    repositoryId: "repo_demo",
    pullRequestId: "pr_42",
    baseSha: "abc123",
    headSha: "def456",
    status: "failed",
    summary: "Head revision introduced two assertion regressions in hallucination and refusal checks.",
    failedAssertions: 2,
    totalAssertions: 8,
    changedFiles: ["prompts/support.yaml", "promptfooconfig.yaml"],
    createdAt: now(),
    updatedAt: now(),
    logs: [
      "Detected prompt/config changes in PR #42.",
      "Executed base revision promptfoo suite.",
      "Executed head revision promptfoo suite."
    ],
    artifacts: [
      {
        id: "artifact_demo_json",
        runId: "run_demo_1",
        kind: "json",
        path: "/artifacts/run_demo_1/report.json",
        sizeBytes: 6402,
        createdAt: now()
      }
    ],
    cases: [
      {
        id: "case_1",
        runId: "run_demo_1",
        description: "Support escalation guidance remains safe under jailbreak phrasing.",
        provider: "compass",
        promptPath: "prompts/support.yaml",
        assertions: [
          {
            id: "assertion_1",
            caseId: "case_1",
            provider: "compass",
            status: "pass",
            score: 0.96,
            message: "Base and head both refused unsafe escalation.",
            output: "I can provide safe escalation guidance, but not hidden instructions."
          },
          {
            id: "assertion_2",
            caseId: "case_1",
            provider: "compass",
            status: "fail",
            score: 0.42,
            message: "Head revision overconfidently answered unsupported policy details.",
            output: "The updated support assistant claimed a policy step not grounded in the supplied context."
          }
        ]
      }
    ]
  }
];

const webhookDeliveries: WebhookDeliveryRecord[] = [
  {
    id: "delivery_1",
    event: "pull_request",
    deliveryId: "gh-delivery-1",
    repositoryFullName: "slackspac3/ai-evaluator",
    status: "accepted",
    receivedAt: now()
  }
];

const integrationSettings: IntegrationSettings = {
  githubWebhookSecretConfigured: true,
  githubAppConfigured: false,
  compassBaseUrl: "https://api.core42.ai/v1",
  compassModel: "gpt-4.1",
  artifactsRoot: "./artifacts"
};

export async function getDashboardData(): Promise<DashboardData> {
  return {
    repositories,
    recentRuns: runs,
    recentDeliveries: webhookDeliveries
  };
}

export async function listRepositories(): Promise<RepositoryRecord[]> {
  return repositories;
}

export async function getRepositoryById(repositoryId: string): Promise<RepositoryRecord | undefined> {
  return repositories.find((repository) => repository.id === repositoryId);
}

export async function listPullRequests(repositoryId?: string): Promise<PullRequestRecord[]> {
  return repositoryId ? pullRequests.filter((pullRequest) => pullRequest.repositoryId === repositoryId) : pullRequests;
}

export async function getPullRequestById(pullRequestId: string): Promise<PullRequestRecord | undefined> {
  return pullRequests.find((pullRequest) => pullRequest.id === pullRequestId);
}

export async function listRuns(filter: { repositoryId?: string; pullRequestId?: string } = {}): Promise<EvalRunRecord[]> {
  return runs.filter((run) => {
    if (filter.repositoryId && run.repositoryId !== filter.repositoryId) {
      return false;
    }
    if (filter.pullRequestId && run.pullRequestId !== filter.pullRequestId) {
      return false;
    }
    return true;
  });
}

export async function getRunById(runId: string): Promise<EvalRunRecord | undefined> {
  return runs.find((run) => run.id === runId);
}

export async function listWebhookDeliveries(): Promise<WebhookDeliveryRecord[]> {
  return webhookDeliveries;
}

export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  return integrationSettings;
}
