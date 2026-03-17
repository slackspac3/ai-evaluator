# AI Evaluator

Self-hosted AI assurance product modeled on `promptfoo-action`, designed for GitHub pull request evaluations and live website AI reviews with a non-technical wizard UI and Compass GPT-5.1-backed model execution.

## MVP

- GitHub webhook ingestion for pull requests and pushes
- Prompt/config change detection
- Base vs head promptfoo evaluations
- Guided wizard for security, fairness, bias, ethics, and safety reviews
- Executive and technical report views for each assessment
- Persistent run metadata, logs, artifacts, and summaries
- Web UI for dashboard, repository, pull request, and run drill-down
- Optional online deployment through Vercel plus managed Postgres

## Current state

- The app now reads its dashboard, repository, pull request, run, settings, and webhook delivery data from PostgreSQL.
- On first boot it creates the minimum schema automatically and seeds one demo repository, pull request, and run so the UI has real persisted data.
- The webhook route now stores delivery records, repositories, pull requests, and queued evaluation runs in Postgres.
- Promptfoo execution now attempts a real CLI run when a promptfoo config file is present in the app working directory and the dependency is installed. If either is missing, the run is stored as `skipped` with clear logs instead of fake pass/fail output.
- The current worker writes JSON artifacts first. HTML export is intentionally disabled for now to stay compatible with the promptfoo CLI version installed in the project.
- When `GITHUB_TOKEN` is configured, the webhook route fetches the actual changed PR files and writes a temporary promptfoo workspace from the PR head revision before execution.
- The sample `promptfooconfig.yaml` is now wired for Compass GPT-5.1 through Core42's OpenAI-compatible API base URL.
- The homepage is now a wizard-led assessment launcher rather than a dashboard redirect.
- A Vercel route at `/api/compass` can act as a secure proxy for browser-facing Compass usage.
- Assessment reports can now ask Compass GPT-5.1 for an executive summary when `COMPASS_API_KEY` is configured.

## Workspace layout

- `apps/web`: Next.js frontend and API route handlers
- `apps/worker`: background job runner
- `packages/integrations/github`: GitHub webhook and API client logic
- `packages/integrations/compass`: Compass API client helpers
- `packages/evals/promptfoo`: promptfoo execution wrapper
- `packages/config`: typed runtime config
- `packages/db`: Postgres schema and repository helpers
- `packages/logger`: structured logging
- `packages/storage`: artifact storage abstraction
- `packages/jobs`: BullMQ queue contracts
- `packages/ui`: shared presentational components
- `packages/types`: shared domain types

## Local requirements

- Node.js 20+
- PostgreSQL
- Redis

## Commands

```bash
npm install
npm run dev
```

Additional details are in [`docs/architecture.md`](./docs/architecture.md).

## Local worker

The Vercel app now queues runs for a separate local worker.

To process queued runs on your machine:

```bash
cd /Users/bhavuk.arora/ai-assessment-portal
npm run dev --workspace @ai-evaluator/worker
```

Keep that terminal open. When you create or update a pull request, the Vercel app writes a queued run to Postgres and the local worker picks it up.

## Promptfoo runtime notes

- For online deployments, set `ARTIFACTS_ROOT=/tmp/ai-evaluator-artifacts` so promptfoo JSON/HTML exports can be written safely.
- Set `GITHUB_TOKEN` in Vercel so the app can fetch pull request files and promptfoo config content from GitHub.
- Set the same `DATABASE_URL` and `GITHUB_TOKEN` locally before starting the worker so it can read queued runs and fetch PR files.
- If promptfoo reports a `better-sqlite3` native module mismatch on your laptop, run `npm install` again in the repo so native dependencies rebuild for your current Node version.
- The current MVP now builds a temporary workspace from the PR head revision only. The next step is fetching both base and head snapshots so before-vs-after promptfoo comparisons are real end to end.

## Simple GitHub test flow

The repo now includes:

- `promptfooconfig.yaml`
- `prompts/support-assistant.txt`

For a simple non-technical test:

1. Open the repo on GitHub.
2. Open `prompts/support-assistant.txt`.
3. Click the pencil icon.
4. Change one line, for example add `Keep answers factual.` under the second line.
5. Choose `Create a new branch for this commit and start a pull request`.
6. Create the pull request.
7. Open the deployed app dashboard and inspect the newest run.
