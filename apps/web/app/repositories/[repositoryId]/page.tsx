import { notFound } from "next/navigation";

import { getRepositoryById, listPullRequests, listRuns } from "@/lib/data";
import { SectionHeader, StatusPill } from "@/components/section";

export const dynamic = "force-dynamic";

export default async function RepositoryPage({ params }: { params: Promise<{ repositoryId: string }> }) {
  const { repositoryId } = await params;
  const repository = await getRepositoryById(repositoryId);
  if (!repository) {
    notFound();
  }
  const pullRequests = await listPullRequests(repositoryId);
  const runs = await listRuns({ repositoryId });

  return (
    <div className="stack">
      <section className="hero">
        <p className="muted">Repository Detail</p>
        <h2>{repository.fullName}</h2>
        <p>Default branch: {repository.defaultBranch}. This is where GitHub webhook traffic is mapped into evaluation runs.</p>
      </section>

      <section className="grid-2">
        <div className="panel card">
          <SectionHeader title="Open Pull Requests" subtitle="Pull requests with prompt/config changes that can trigger promptfoo evaluations." />
          <ul className="plain-list">
            {pullRequests.map((pullRequest) => (
              <li key={pullRequest.id}>
                <a href={`/pull-requests/${pullRequest.id}`}>
                  #{pullRequest.githubPrNumber} {pullRequest.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel card">
          <SectionHeader title="Recent Runs" subtitle="Historical evaluation runs linked back to this repository." />
          <ul className="plain-list">
            {runs.map((run) => (
              <li key={run.id}>
                <a href={`/runs/${run.id}`}>{run.id}</a> <StatusPill status={run.status} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
