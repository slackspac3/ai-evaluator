export const EVAL_QUEUE_NAME = "prompt-eval-runs";

export type EvalJobPayload = {
  repositoryId: string;
  pullRequestId?: string;
  baseSha: string;
  headSha: string;
  changedFiles: string[];
};

