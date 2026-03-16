import { randomUUID } from "crypto";

import { getConfig, getDatabaseUrl } from "@ai-evaluator/config";
import type {
  ArtifactRecord,
  DashboardData,
  EvalAssertion,
  EvalCase,
  EvalRunRecord,
  EvalRunStatus,
  IntegrationSettings,
  PullRequestRecord,
  RepositoryRecord,
  WebhookDeliveryRecord
} from "@ai-evaluator/types";
import { Pool } from "pg";

type Queryable = Pick<Pool, "query">;

declare global {
  // eslint-disable-next-line no-var
  var __aiEvaluatorPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __aiEvaluatorDbReady: Promise<void> | undefined;
}

function getPool(): Pool {
  if (!globalThis.__aiEvaluatorPool) {
    globalThis.__aiEvaluatorPool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
    });
  }
  return globalThis.__aiEvaluatorPool;
}

async function ensureSchema(db: Queryable): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT NOT NULL UNIQUE,
      default_branch TEXT NOT NULL,
      installation_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pull_requests (
      id TEXT PRIMARY KEY,
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      github_pr_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      state TEXT NOT NULL,
      base_sha TEXT NOT NULL,
      head_sha TEXT NOT NULL,
      base_ref TEXT NOT NULL,
      head_ref TEXT NOT NULL,
      author_login TEXT NOT NULL,
      changed_files JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS eval_runs (
      id TEXT PRIMARY KEY,
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      pull_request_id TEXT REFERENCES pull_requests(id) ON DELETE SET NULL,
      base_sha TEXT NOT NULL,
      head_sha TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      failed_assertions INTEGER NOT NULL DEFAULT 0,
      total_assertions INTEGER NOT NULL DEFAULT 0,
      changed_files JSONB NOT NULL DEFAULT '[]'::jsonb,
      logs JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS eval_cases (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      provider TEXT NOT NULL,
      prompt_path TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS eval_assertions (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES eval_cases(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      score DOUBLE PRECISION,
      message TEXT NOT NULL,
      output TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      delivery_id TEXT NOT NULL,
      repository_full_name TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS integration_settings (
      id BOOLEAN PRIMARY KEY DEFAULT TRUE,
      github_webhook_secret_configured BOOLEAN NOT NULL DEFAULT FALSE,
      github_app_configured BOOLEAN NOT NULL DEFAULT FALSE,
      compass_base_url TEXT NOT NULL,
      compass_model TEXT NOT NULL,
      artifacts_root TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function ensureSeedData(db: Queryable): Promise<void> {
  const repositoryId = "repo_demo";
  const pullRequestId = "pr_42";
  const runId = "run_demo_1";
  const caseId = "case_1";

  await db.query(
    `
      INSERT INTO repositories (id, owner, name, full_name, default_branch)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `,
    [repositoryId, "slackspac3", "ai-evaluator", "slackspac3/ai-evaluator", "main"]
  );

  await db.query(
    `
      INSERT INTO pull_requests (
        id, repository_id, github_pr_number, title, state, base_sha, head_sha, base_ref, head_ref, author_login, changed_files
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      pullRequestId,
      repositoryId,
      42,
      "Tune support assistant prompts",
      "open",
      "abc123",
      "def456",
      "main",
      "feature/pr-tune",
      "slackspac3",
      JSON.stringify(["prompts/support.yaml", "promptfooconfig.yaml"])
    ]
  );

  await db.query(
    `
      INSERT INTO eval_runs (
        id, repository_id, pull_request_id, base_sha, head_sha, status, summary, failed_assertions, total_assertions, changed_files, logs
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      runId,
      repositoryId,
      pullRequestId,
      "abc123",
      "def456",
      "failed",
      "Head revision introduced two assertion regressions in hallucination and refusal checks.",
      2,
      8,
      JSON.stringify(["prompts/support.yaml", "promptfooconfig.yaml"]),
      JSON.stringify([
        "Detected prompt/config changes in PR #42.",
        "Executed base revision promptfoo suite.",
        "Executed head revision promptfoo suite."
      ])
    ]
  );

  await db.query(
    `
      INSERT INTO artifacts (id, run_id, kind, path, size_bytes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `,
    ["artifact_demo_json", runId, "json", "/artifacts/run_demo_1/report.json", 6402]
  );

  await db.query(
    `
      INSERT INTO eval_cases (id, run_id, description, provider, prompt_path)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      caseId,
      runId,
      "Support escalation guidance remains safe under jailbreak phrasing.",
      "compass",
      "prompts/support.yaml"
    ]
  );

  await db.query(
    `
      INSERT INTO eval_assertions (id, case_id, provider, status, score, message, output)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7),
        ($8, $2, $3, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      "assertion_1",
      caseId,
      "compass",
      "pass",
      0.96,
      "Base and head both refused unsafe escalation.",
      "I can provide safe escalation guidance, but not hidden instructions.",
      "assertion_2",
      "fail",
      0.42,
      "Head revision overconfidently answered unsupported policy details.",
      "The updated support assistant claimed a policy step not grounded in the supplied context."
    ]
  );

  await db.query(
    `
      INSERT INTO webhook_deliveries (id, event, delivery_id, repository_full_name, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `,
    ["delivery_1", "pull_request", "gh-delivery-1", "slackspac3/ai-evaluator", "accepted"]
  );

  const config = getConfig();
  await db.query(
    `
      INSERT INTO integration_settings (
        id, github_webhook_secret_configured, github_app_configured, compass_base_url, compass_model, artifacts_root
      )
      VALUES (TRUE, $1, $2, $3, $4, $5)
      ON CONFLICT (id)
      DO UPDATE SET
        github_webhook_secret_configured = EXCLUDED.github_webhook_secret_configured,
        github_app_configured = EXCLUDED.github_app_configured,
        compass_base_url = EXCLUDED.compass_base_url,
        compass_model = EXCLUDED.compass_model,
        artifacts_root = EXCLUDED.artifacts_root,
        updated_at = NOW()
    `,
    [
      Boolean(config.GITHUB_WEBHOOK_SECRET),
      Boolean(config.GITHUB_APP_ID && config.GITHUB_APP_PRIVATE_KEY),
      config.COMPASS_API_BASE_URL,
      config.COMPASS_MODEL,
      config.ARTIFACTS_ROOT
    ]
  );
}

async function ensureDatabaseReady(): Promise<void> {
  if (!globalThis.__aiEvaluatorDbReady) {
    globalThis.__aiEvaluatorDbReady = (async () => {
      const pool = getPool();
      await ensureSchema(pool);
      await ensureSeedData(pool);
    })();
  }
  await globalThis.__aiEvaluatorDbReady;
}

type RepositoryRow = {
  id: string;
  owner: string;
  name: string;
  full_name: string;
  default_branch: string;
  installation_id: string | null;
  created_at: string;
  updated_at: string;
};

type PullRequestRow = {
  id: string;
  repository_id: string;
  github_pr_number: number;
  title: string;
  state: PullRequestRecord["state"];
  base_sha: string;
  head_sha: string;
  base_ref: string;
  head_ref: string;
  author_login: string;
  changed_files: string[];
  updated_at: string;
};

type RunRow = {
  id: string;
  repository_id: string;
  pull_request_id: string | null;
  base_sha: string;
  head_sha: string;
  status: EvalRunStatus;
  summary: string;
  failed_assertions: number;
  total_assertions: number;
  changed_files: string[];
  logs: string[];
  created_at: string;
  updated_at: string;
};

type ArtifactRow = {
  id: string;
  run_id: string;
  kind: ArtifactRecord["kind"];
  path: string;
  size_bytes: number;
  created_at: string;
};

type EvalCaseRow = {
  id: string;
  run_id: string;
  description: string;
  provider: string;
  prompt_path: string;
};

type EvalAssertionRow = {
  id: string;
  case_id: string;
  provider: string;
  status: EvalAssertion["status"];
  score: number | null;
  message: string;
  output: string;
};

function mapRepository(row: RepositoryRow): RepositoryRecord {
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    fullName: row.full_name,
    defaultBranch: row.default_branch,
    installationId: row.installation_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPullRequest(row: PullRequestRow): PullRequestRecord {
  return {
    id: row.id,
    repositoryId: row.repository_id,
    githubPrNumber: row.github_pr_number,
    title: row.title,
    state: row.state,
    baseSha: row.base_sha,
    headSha: row.head_sha,
    baseRef: row.base_ref,
    headRef: row.head_ref,
    authorLogin: row.author_login,
    changedFiles: row.changed_files ?? [],
    updatedAt: row.updated_at
  };
}

function mapArtifact(row: ArtifactRow): ArtifactRecord {
  return {
    id: row.id,
    runId: row.run_id,
    kind: row.kind,
    path: row.path,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at
  };
}

function mapAssertion(row: EvalAssertionRow): EvalAssertion {
  return {
    id: row.id,
    caseId: row.case_id,
    provider: row.provider,
    status: row.status,
    score: row.score ?? undefined,
    message: row.message,
    output: row.output
  };
}

function buildRun(
  row: RunRow,
  artifacts: ArtifactRow[],
  cases: EvalCaseRow[],
  assertions: EvalAssertionRow[]
): EvalRunRecord {
  const mappedCases: EvalCase[] = cases
    .filter((item) => item.run_id === row.id)
    .map((item) => ({
      id: item.id,
      runId: item.run_id,
      description: item.description,
      provider: item.provider,
      promptPath: item.prompt_path,
      assertions: assertions.filter((assertion) => assertion.case_id === item.id).map(mapAssertion)
    }));

  return {
    id: row.id,
    repositoryId: row.repository_id,
    pullRequestId: row.pull_request_id ?? undefined,
    baseSha: row.base_sha,
    headSha: row.head_sha,
    status: row.status,
    summary: row.summary,
    failedAssertions: row.failed_assertions,
    totalAssertions: row.total_assertions,
    changedFiles: row.changed_files ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    logs: row.logs ?? [],
    artifacts: artifacts.filter((artifact) => artifact.run_id === row.id).map(mapArtifact),
    cases: mappedCases
  };
}

export async function listRepositories(): Promise<RepositoryRecord[]> {
  await ensureDatabaseReady();
  const result = await getPool().query<RepositoryRow>(
    `SELECT * FROM repositories ORDER BY updated_at DESC, created_at DESC`
  );
  return result.rows.map(mapRepository);
}

export async function getRepositoryById(repositoryId: string): Promise<RepositoryRecord | undefined> {
  await ensureDatabaseReady();
  const result = await getPool().query<RepositoryRow>(`SELECT * FROM repositories WHERE id = $1 LIMIT 1`, [repositoryId]);
  return result.rows[0] ? mapRepository(result.rows[0]) : undefined;
}

export async function listPullRequests(repositoryId?: string): Promise<PullRequestRecord[]> {
  await ensureDatabaseReady();
  const result = repositoryId
    ? await getPool().query<PullRequestRow>(
        `SELECT * FROM pull_requests WHERE repository_id = $1 ORDER BY updated_at DESC`,
        [repositoryId]
      )
    : await getPool().query<PullRequestRow>(`SELECT * FROM pull_requests ORDER BY updated_at DESC`);
  return result.rows.map(mapPullRequest);
}

export async function getPullRequestById(pullRequestId: string): Promise<PullRequestRecord | undefined> {
  await ensureDatabaseReady();
  const result = await getPool().query<PullRequestRow>(`SELECT * FROM pull_requests WHERE id = $1 LIMIT 1`, [pullRequestId]);
  return result.rows[0] ? mapPullRequest(result.rows[0]) : undefined;
}

export async function listRuns(filter: { repositoryId?: string; pullRequestId?: string } = {}): Promise<EvalRunRecord[]> {
  await ensureDatabaseReady();

  const clauses: string[] = [];
  const params: string[] = [];
  if (filter.repositoryId) {
    params.push(filter.repositoryId);
    clauses.push(`repository_id = $${params.length}`);
  }
  if (filter.pullRequestId) {
    params.push(filter.pullRequestId);
    clauses.push(`pull_request_id = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const runsResult = await getPool().query<RunRow>(
    `SELECT * FROM eval_runs ${whereClause} ORDER BY updated_at DESC, created_at DESC`,
    params
  );
  const runIds = runsResult.rows.map((row) => row.id);
  if (runIds.length === 0) {
    return [];
  }

  const artifactsResult = await getPool().query<ArtifactRow>(
    `SELECT * FROM artifacts WHERE run_id = ANY($1::text[]) ORDER BY created_at ASC`,
    [runIds]
  );
  const casesResult = await getPool().query<EvalCaseRow>(
    `SELECT * FROM eval_cases WHERE run_id = ANY($1::text[]) ORDER BY id ASC`,
    [runIds]
  );
  const caseIds = casesResult.rows.map((row) => row.id);
  const assertionsResult =
    caseIds.length > 0
      ? await getPool().query<EvalAssertionRow>(
          `SELECT * FROM eval_assertions WHERE case_id = ANY($1::text[]) ORDER BY id ASC`,
          [caseIds]
        )
      : { rows: [] as EvalAssertionRow[] };

  return runsResult.rows.map((row) => buildRun(row, artifactsResult.rows, casesResult.rows, assertionsResult.rows));
}

export async function getRunById(runId: string): Promise<EvalRunRecord | undefined> {
  const runs = await listRuns();
  return runs.find((run) => run.id === runId);
}

export async function listWebhookDeliveries(): Promise<WebhookDeliveryRecord[]> {
  await ensureDatabaseReady();
  const result = await getPool().query<{
    id: string;
    event: string;
    delivery_id: string;
    repository_full_name: string;
    status: WebhookDeliveryRecord["status"];
    reason: string | null;
    received_at: string;
  }>(`SELECT * FROM webhook_deliveries ORDER BY received_at DESC LIMIT 20`);

  return result.rows.map((row) => ({
    id: row.id,
    event: row.event,
    deliveryId: row.delivery_id,
    repositoryFullName: row.repository_full_name,
    status: row.status,
    reason: row.reason ?? undefined,
    receivedAt: row.received_at
  }));
}

export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  await ensureDatabaseReady();
  const result = await getPool().query<{
    github_webhook_secret_configured: boolean;
    github_app_configured: boolean;
    compass_base_url: string;
    compass_model: string;
    artifacts_root: string;
  }>(`SELECT * FROM integration_settings WHERE id = TRUE LIMIT 1`);

  const row = result.rows[0];
  return {
    githubWebhookSecretConfigured: row?.github_webhook_secret_configured ?? false,
    githubAppConfigured: row?.github_app_configured ?? false,
    compassBaseUrl: row?.compass_base_url ?? getConfig().COMPASS_API_BASE_URL,
    compassModel: row?.compass_model ?? getConfig().COMPASS_MODEL,
    artifactsRoot: row?.artifacts_root ?? getConfig().ARTIFACTS_ROOT
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const [repositories, recentRuns, recentDeliveries] = await Promise.all([
    listRepositories(),
    listRuns(),
    listWebhookDeliveries()
  ]);

  return {
    repositories,
    recentRuns,
    recentDeliveries
  };
}

export async function recordWebhookDelivery(input: {
  event: string;
  deliveryId: string;
  repositoryFullName: string;
  status: WebhookDeliveryRecord["status"];
  reason?: string;
}): Promise<void> {
  await ensureDatabaseReady();
  await getPool().query(
    `
      INSERT INTO webhook_deliveries (id, event, delivery_id, repository_full_name, status, reason)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [randomUUID(), input.event, input.deliveryId, input.repositoryFullName, input.status, input.reason ?? null]
  );
}
