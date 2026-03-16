import test from "node:test";
import assert from "node:assert/strict";

import { getDatabaseUrl, resetConfigCache } from "@ai-evaluator/config";

test("getDatabaseUrl prefers DATABASE_URL then POSTGRES_URL then STORAGE_URL", () => {
  resetConfigCache();
  assert.equal(
    getDatabaseUrl({
      DATABASE_URL: "postgres://primary",
      POSTGRES_URL: "postgres://secondary",
      STORAGE_URL: "postgres://tertiary"
    }),
    "postgres://primary"
  );

  resetConfigCache();
  assert.equal(
    getDatabaseUrl({
      POSTGRES_URL: "postgres://secondary",
      STORAGE_URL: "postgres://tertiary"
    }),
    "postgres://secondary"
  );

  resetConfigCache();
  assert.equal(
    getDatabaseUrl({
      STORAGE_URL: "postgres://tertiary"
    }),
    "postgres://tertiary"
  );
});
