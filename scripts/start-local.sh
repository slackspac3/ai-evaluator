#!/usr/bin/env bash
set -euo pipefail

echo "AI Evaluator local setup"
echo "1. Start Postgres and Redis: docker compose up -d"
echo "2. Install workspace dependencies: npm install"
echo "3. Start web: npm run dev"
echo "4. Start worker: npm run dev --workspace @ai-evaluator/worker"
