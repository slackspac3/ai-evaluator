import { notFound } from "next/navigation";

import { getPullRequestById, listRuns } from "@/lib/data";
import { SectionHeader, StatusPill } from "@/components/section";

export const dynamic = "force-dynamic";

export default async function PullRequestPage({ params }: { params: Promise<{ pullRequestId: string }> }) {
  const { pullRequestId } = await params;
  const pullRequest = await getPullRequestById(pullRequestId);
  if (!pullRequest) {
    notFound();
  }
  const runs = await listRuns({ pullRequestId });

  return (
    <div className="stack">
      <section className="hero">
        <p className="muted">Pull Request Review</p>
        <h2>#{pullRequest.githubPrNumber} {pullRequest.title}</h2>
        <p>
          Base `{pullRequest.baseSha}` vs head `{pullRequest.headSha}`. The product only runs evaluations when prompt or promptfoo-related
          files change.
        </p>
      </section>

      <section className="grid-2">
        <div className="panel card">
          <SectionHeader title="Changed Files" subtitle="Files used to decide whether this PR should trigger an evaluation run." />
          <ul className="plain-list">
            {pullRequest.changedFiles.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </div>
        <div className="panel card">
          <SectionHeader title="Evaluation Runs" subtitle="Base vs head run history linked to this pull request." />
          <ul className="plain-list">
            {runs.map((run) => (
              <li key={run.id}>
                <a href={`/runs/${run.id}`}>{run.id}</a> <StatusPill status={run.status} /> {run.failedAssertions}/{run.totalAssertions}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
