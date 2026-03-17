import Link from "next/link";

import { getDashboardData } from "@/lib/data";
import { SectionHeader, StatusPill } from "@/components/section";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return (
    <div className="stack">
      <section className="hero">
        <p className="muted">AI review workspace for checking prompt changes, model behavior, and release readiness.</p>
        <h2>See what changed, what passed, and what needs attention without reading raw terminal logs.</h2>
        <div className="hero-actions">
          <Link className="button button-primary" href="/repositories/repo_demo">
            Open Demo System
          </Link>
          <a className="button button-secondary" href="/api/manual-runs?mode=demo">
            Run Sample Assessment
          </a>
          <Link className="button button-secondary" href="/settings">
            Review Setup
          </Link>
        </div>
        <p className="muted">
          Use <strong>Run Sample Assessment</strong> when you want to create a fresh run from the app without editing GitHub.
        </p>
      </section>

      <section className="grid-4">
        <div className="panel stat-tile">
          <span className="muted">Systems</span>
          <strong>{dashboard.repositories.length}</strong>
        </div>
        <div className="panel stat-tile">
          <span className="muted">Assessments</span>
          <strong>{dashboard.recentRuns.length}</strong>
        </div>
        <div className="panel stat-tile">
          <span className="muted">Checks Needing Review</span>
          <strong>{dashboard.recentRuns.reduce((sum, run) => sum + run.failedAssertions, 0)}</strong>
        </div>
        <div className="panel stat-tile">
          <span className="muted">GitHub Events</span>
          <strong>{dashboard.recentDeliveries.length}</strong>
        </div>
      </section>

      <section className="panel card">
        <SectionHeader
          title="Recent Assessments"
          subtitle="Latest AI checks triggered by pull request and repository changes."
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Status</th>
                <th>Checks</th>
                <th>Changed Files</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentRuns.map((run) => (
                <tr key={run.id}>
                  <td>
                    <strong>{run.summary}</strong>
                    <div className="muted">{run.id}</div>
                  </td>
                  <td>
                    <StatusPill status={run.status} />
                  </td>
                  <td>
                    {run.failedAssertions}/{run.totalAssertions}
                  </td>
                  <td>{run.changedFiles.join(", ")}</td>
                  <td>
                    <Link href={`/runs/${run.id}`}>View details</Link>
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
            title="Systems"
            subtitle="Connected GitHub repositories being monitored for AI prompt changes."
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
            title="GitHub Activity"
            subtitle="Recent webhook events received from GitHub."
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
