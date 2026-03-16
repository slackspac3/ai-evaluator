import Link from "next/link";

import { getDashboardData } from "@/lib/data";
import { SectionHeader, StatusPill } from "@/components/section";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return (
    <div className="stack">
      <section className="hero">
        <p className="muted">GitHub webhook-driven prompt evaluations with promptfoo execution and Compass-backed models.</p>
        <h2>Pull request regressions, before-vs-after diffs, and failed assertions in one place.</h2>
        <div className="hero-actions">
          <Link className="button button-primary" href="/repositories/repo_demo">
            Open Demo Repository
          </Link>
          <Link className="button button-secondary" href="/settings">
            Review Integration Settings
          </Link>
        </div>
      </section>

      <section className="grid-4">
        <div className="panel stat-tile">
          <span className="muted">Repositories</span>
          <strong>{dashboard.repositories.length}</strong>
        </div>
        <div className="panel stat-tile">
          <span className="muted">Recent Runs</span>
          <strong>{dashboard.recentRuns.length}</strong>
        </div>
        <div className="panel stat-tile">
          <span className="muted">Failed Assertions</span>
          <strong>{dashboard.recentRuns.reduce((sum, run) => sum + run.failedAssertions, 0)}</strong>
        </div>
        <div className="panel stat-tile">
          <span className="muted">Webhook Deliveries</span>
          <strong>{dashboard.recentDeliveries.length}</strong>
        </div>
      </section>

      <section className="panel card">
        <SectionHeader
          title="Recent Evaluation Runs"
          subtitle="Runs triggered from GitHub pull requests and pushes, normalized into a developer-friendly review surface."
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Status</th>
                <th>Assertions</th>
                <th>Changed Files</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentRuns.map((run) => (
                <tr key={run.id}>
                  <td>
                    <strong>{run.id}</strong>
                    <div className="muted">{run.summary}</div>
                  </td>
                  <td>
                    <StatusPill status={run.status} />
                  </td>
                  <td>
                    {run.failedAssertions}/{run.totalAssertions}
                  </td>
                  <td>{run.changedFiles.join(", ")}</td>
                  <td>
                    <Link href={`/runs/${run.id}`}>View run</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel card">
          <SectionHeader
            title="Repositories"
            subtitle="Connected GitHub repositories that can emit prompt evaluation runs."
          />
          <ul className="plain-list">
            {dashboard.repositories.map((repository) => (
              <li key={repository.id}>
                <Link href={`/repositories/${repository.id}`}>{repository.fullName}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel card">
          <SectionHeader
            title="Webhook Deliveries"
            subtitle="Recent GitHub webhook traffic and ingestion status."
          />
          <ul className="plain-list">
            {dashboard.recentDeliveries.map((delivery) => (
              <li key={delivery.id}>
                <strong>{delivery.event}</strong> for {delivery.repositoryFullName} <StatusPill status={delivery.status} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

