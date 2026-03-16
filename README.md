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
- The webhook route stores delivery records in Postgres and still uses a stubbed promptfoo comparison result until the execution step is wired fully.

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
