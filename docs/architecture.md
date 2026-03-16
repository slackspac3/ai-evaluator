# Architecture

## Goal

Deliver the core workflow of `promptfoo-action` as a standalone web product that runs on our own infrastructure, with GitHub-triggered evaluations, persistent storage, and a developer-facing UI.

## Product boundaries

- Use promptfoo as the execution engine through its CLI or Node surface.
- Do not reimplement prompt evaluation logic from scratch.
- Limit external integrations to GitHub and Compass API.
- Prefer an online MVP that can run on Vercel plus managed Postgres, while keeping a path to fuller self-hosting later.

## MVP architecture

### apps/web

- Next.js app router application
- Hosts the user-facing UI
- Owns HTTP API routes and GitHub webhook ingestion
- Reads and writes Postgres through shared repository helpers

### apps/worker

- Long-running job processor
- Pulls queued evaluation jobs from BullMQ
- Checks out base and head revisions
- Executes promptfoo twice, compares results, stores artifacts and normalized summaries

### packages/integrations/github

- Webhook signature verification
- PR metadata extraction
- Changed-file filtering for prompt/config changes
- Repo and pull request syncing

### packages/integrations/compass

- Compass API client helpers and model-provider config
- Keeps Compass-specific request details out of the app surface
- Designed to back promptfoo provider configuration, not a separate UI integration

### packages/evals/promptfoo

- Thin wrapper around promptfoo
- Builds base and head commands
- Captures stdout, stderr, exit codes, JSON output, and artifact paths

### packages/db

- Shared SQL models and repository functions
- Stores repositories, pull requests, commits, eval runs, eval cases, assertions, webhook deliveries, sync logs, and integration settings

### packages/storage

- Filesystem-backed artifact storage for MVP
- Clean interface for future S3-compatible providers

## Data flow

1. GitHub sends a PR or push webhook to `apps/web`.
2. Webhook route verifies the signature and stores a delivery record.
3. GitHub integration determines whether relevant files changed.
4. A run record and BullMQ job are created.
5. The worker loads repo metadata, fetches base/head revisions, and invokes promptfoo.
6. Results are normalized into eval cases and assertions.
7. Artifacts and logs are persisted.
8. The web UI displays summaries, diffs, and failure drill-downs.

## Online MVP tradeoffs

- Vercel is acceptable for the web tier and webhook routes.
- Managed Postgres is required for durable state.
- Redis plus BullMQ remains the right long-running job abstraction even if the worker is initially hosted outside Vercel.
- Filesystem artifact storage is suitable for local and single-host deployments; online production should evolve toward object storage.

## Security

- Secrets stay in runtime environment variables.
- GitHub webhook signatures are verified.
- Structured logs redact secrets.
- Promptfoo execution uses explicit checked-out revisions, not mutable working trees.
