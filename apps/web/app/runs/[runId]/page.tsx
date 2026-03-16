import { notFound } from "next/navigation";

import { getRunById } from "@/lib/data";
import { SectionHeader, StatusPill } from "@/components/section";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await getRunById(runId);
  if (!run) {
    notFound();
  }

  return (
    <div className="stack">
      <section className="hero">
        <p className="muted">Evaluation Run Detail</p>
        <h2>{run.id}</h2>
        <p>{run.summary}</p>
        <div className="hero-actions">
          <StatusPill status={run.status} />
          <span className="muted">
            Failed assertions: {run.failedAssertions}/{run.totalAssertions}
          </span>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel card">
          <SectionHeader title="Execution Log" subtitle="Normalized run log, replacing raw CI output with a concise narrative." />
          <ul className="plain-list">
            {run.logs.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="panel card">
          <SectionHeader title="Artifacts" subtitle="Stored outputs and downloadable promptfoo artifacts." />
          <ul className="plain-list">
            {run.artifacts.map((artifact) => (
              <li key={artifact.id}>
                {artifact.kind}: {artifact.path} ({artifact.sizeBytes} bytes)
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel card">
        <SectionHeader title="Eval Cases" subtitle="Drill down from summary to case-level outputs and assertion details." />
        <div className="stack">
          {run.cases.map((evalCase) => (
            <article key={evalCase.id} className="detail-card">
              <h3>{evalCase.description}</h3>
              <p className="muted">
                Provider: {evalCase.provider} | Prompt path: {evalCase.promptPath}
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Assertion</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Message</th>
                      <th>Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalCase.assertions.map((assertion) => (
                      <tr key={assertion.id}>
                        <td>{assertion.provider}</td>
                        <td><StatusPill status={assertion.status} /></td>
                        <td>{assertion.score ?? "n/a"}</td>
                        <td>{assertion.message}</td>
                        <td>{assertion.output}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
