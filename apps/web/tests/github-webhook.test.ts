import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import {
  extractPushChangedFiles,
  extractRelevantFiles,
  resolvePromptfooConfigPath,
  verifyGitHubSignature
} from "@ai-evaluator/integrations-github";

test("extractRelevantFiles keeps prompt and config files", () => {
  const result = extractRelevantFiles(["README.md", "prompts/support.yaml", "docs/architecture.md", "promptfooconfig.json"]);
  assert.deepEqual(result, ["prompts/support.yaml", "promptfooconfig.json"]);
});

test("verifyGitHubSignature validates the webhook signature", () => {
  const body = JSON.stringify({ hello: "world" });
  const secret = "top-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  assert.equal(verifyGitHubSignature(body, signature, secret), true);
  assert.equal(verifyGitHubSignature(body, "sha256=bad", secret), false);
});

test("resolvePromptfooConfigPath prefers changed config files", () => {
  const result = resolvePromptfooConfigPath([
    "README.md",
    "configs/promptfooconfig.yaml",
    "prompts/support.yaml"
  ]);

  assert.equal(result, "configs/promptfooconfig.yaml");
});

test("extractPushChangedFiles flattens commit changes", () => {
  const result = extractPushChangedFiles([
    { added: ["prompts/new.yaml"], modified: ["README.md"], removed: [] },
    { added: [], modified: ["promptfooconfig.yaml"], removed: ["old.json"] }
  ]);

  assert.deepEqual(result, ["prompts/new.yaml", "README.md", "promptfooconfig.yaml", "old.json"]);
});
