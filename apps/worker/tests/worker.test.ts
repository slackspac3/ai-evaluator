import test from "node:test";
import assert from "node:assert/strict";

import { buildPromptfooCommand } from "@ai-evaluator/evals-promptfoo";

test("worker command builder creates base and head promptfoo commands", () => {
  const command = buildPromptfooCommand(
    {
      repositoryFullName: "slackspac3/ai-evaluator",
      baseSha: "abc",
      headSha: "def",
      changedFiles: ["promptfooconfig.yaml"],
      promptConfigPath: "promptfooconfig.yaml"
    },
    "head"
  );

  assert.equal(command[0], "npx");
  assert.equal(command.includes("promptfoo"), true);
});
