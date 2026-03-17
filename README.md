# AI Evaluator

Self-hosted web product modeled on `promptfoo-action`, designed for GitHub pull request evaluations with a friendlier UI and Compass API-backed model execution.

## MVP

- GitHub webhook ingestion for pull requests and pushes
- Prompt/config change detection
- Base vs head promptfoo evaluations
- Persistent run metadata, logs, artifacts, and summaries
- Web UI for dashboard, repository, pull request, and run drill-down
- Optional online deployment through Vercel plus managed Postgres

## Current state

- The app now reads its dashboard, repository, pull request, run, settings, and webhook delivery data from PostgreSQL.
- On first boot it creates the minimum schema automatically and seeds one demo repository, pull request, and run so the UI has real persisted data.
- The webhook route now stores delivery records, repositories, pull requests, and evaluation runs in Postgres.
- Promptfoo execution now attempts a real CLI run when a promptfoo config file is present in the app working directory and the dependency is installed. If either is missing, the run is stored as `skipped` with clear logs instead of fake pass/fail output.
- When `GITHUB_TOKEN` is configured, the webhook route fetches the actual changed PR files and writes a temporary promptfoo workspace from the PR head revision before execution.

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

## Promptfoo runtime notes

- For online deployments, set `ARTIFACTS_ROOT=/tmp/ai-evaluator-artifacts` so promptfoo JSON/HTML exports can be written safely.
- Set `GITHUB_TOKEN` in Vercel so the app can fetch pull request files and promptfoo config content from GitHub.
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
