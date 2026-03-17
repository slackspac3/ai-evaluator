import { notFound } from "next/navigation";

import { getRunById } from "@/lib/data";
import { SectionHeader, StatusPill } from "@/components/section";

export const dynamic = "force-dynamic";

function buildPosture(status: string, failedAssertions: number) {
  if (status === "passed") {
    return { label: "Low risk", description: "No material issues were detected in this assessment." };
  }
  if (status === "queued" || status === "running") {
    return { label: "In progress", description: "The assessment is still collecting evidence and scoring responses." };
  }
  if (status === "skipped") {
    return { label: "Incomplete", description: "The assessment could not complete the planned checks." };
  }
  if (status === "errored") {
    return { label: "Blocked", description: "A runtime error stopped the assessment before it could finish." };
  }
  if (failedAssertions >= 3) {
    return { label: "High risk", description: "Multiple checks need attention before this AI should move forward." };
  }
  return { label: "Needs review", description: "Some checks need follow-up before you treat the AI as ready." };
}

function buildRecommendation(status: string, failedAssertions: number) {
  if (status === "passed") {
    return "No action needed right now. Keep this prompt set as the current baseline and re-run after future edits.";
  }
  if (status === "queued" || status === "running") {
    return "Wait for the assessment to complete. Technical details will appear automatically when processing finishes.";
  }
  if (status === "skipped") {
    return "Review the setup notes in the technical details section. The assessment could not fully execute.";
  }
  if (status === "errored") {
    return "Open the technical details section and resolve the worker or promptfoo runtime error before re-running.";
  }
  if (failedAssertions > 0) {
    return "Review the failing checks below, update the prompt or safety instructions, and run the assessment again.";
  }
  return "Review the assessment details and confirm whether follow-up action is needed.";
}

function buildOutcomeLine(status: string, failedAssertions: number, totalAssertions: number) {
  if (status === "passed") {
    return `${totalAssertions} of ${totalAssertions} checks passed.`;
  }
  if (status === "queued") {
    return "This assessment is waiting for the local worker to pick it up.";
  }
  if (status === "running") {
    return "This assessment is currently being processed.";
  }
  if (status === "skipped") {
    return "This assessment could not finish the planned checks.";
  }
  if (status === "errored") {
    return "This assessment stopped because of a runtime error.";
  }
  return `${failedAssertions} of ${totalAssertions} checks need attention.`;
}

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await getRunById(runId);
  if (!run) {
    notFound();
  }

  const totalCases = run.cases.length;
  const passedCases = run.cases.filter((evalCase) => evalCase.assertions.every((assertion) => assertion.status === "pass")).length;
  const findings = run.cases.filter((evalCase) => evalCase.assertions.some((assertion) => assertion.status === "fail"));
  const posture = buildPosture(run.status, run.failedAssertions);
  const topOutputs = run.cases
    .flatMap((evalCase) =>
      evalCase.assertions
        .filter((assertion) => assertion.output)
        .map((assertion) => ({ caseDescription: evalCase.description, output: assertion.output }))
    )
    .slice(0, 2);

  return (
    <div className="stack">
      <section className="hero report-hero">
        <p className="muted hero-kicker">Assessment Report</p>
        <h2>{run.summary}</h2>
        <p className="hero-lead">{posture.description}</p>
        <div className="hero-actions">
          <StatusPill status={run.status} />
          <span className="summary-chip">{posture.label}</span>
          <span className="summary-chip">{passedCases} checks passed</span>
          <span className="summary-chip">{run.failedAssertions} checks need attention</span>
          <a className="button button-secondary" href={`/api/manual-runs?mode=rerun&runId=${run.id}`}>
            Run This Assessment Again
          </a>
        </div>
        <div className="hero-kpi-grid">
          <div className="hero-kpi">
            <span>Overall outcome</span>
            <strong>{buildOutcomeLine(run.status, run.failedAssertions, run.totalAssertions)}</strong>
          </div>
          <div className="hero-kpi">
            <span>Executive view</span>
            <strong>{posture.label}</strong>
          </div>
          <div className="hero-kpi">
            <span>Technical evidence</span>
            <strong>{run.artifacts.length} files saved</strong>
          </div>
        </div>
      </section>

      <section className="grid-4">
        <div className="panel stat-tile">
          <span className="muted">Overall status</span>
          <strong>{run.status === "passed" ? "Passed" : run.status === "failed" ? "Needs review" : run.status}</strong>
        </div>
        <div className="panel stat-tile">
          <span className="muted">Checks completed</span>
          <strong>{run.totalAssertions}</strong>
        </div>
        <div className="panel stat-tile">
          <span className="muted">Issues found</span>
          <strong>{run.failedAssertions}</strong>
        </div>
        <div className="panel stat-tile">
          <span className="muted">Evidence files</span>
          <strong>{run.artifacts.length}</strong>
        </div>
      </section>

      <section className="report-split">
        <div className="panel card report-section executive-report">
          <SectionHeader
            title="Executive Report"
            subtitle="Plain-language outcome, risk posture, and what to do next."
          />
          <div className="stack compact-stack">
            <div className="friendly-note">
              <strong>Assessment outcome</strong>
              <p>{buildOutcomeLine(run.status, run.failedAssertions, run.totalAssertions)}</p>
            </div>
            <div className="friendly-note">
              <strong>Risk posture</strong>
              <p>{posture.label}. {posture.description}</p>
            </div>
            <div className="friendly-note">
              <strong>Recommended next step</strong>
              <p>{buildRecommendation(run.status, run.failedAssertions)}</p>
            </div>
          </div>
        </div>
        <div className="panel card report-section technical-report">
          <SectionHeader
            title="Technical Report"
            subtitle="Evidence snippets, model outputs, and saved artifacts for reviewers."
          />
          <div className="stack compact-stack">
            {topOutputs.length > 0 ? (
              topOutputs.map((item) => (
                <article key={`${item.caseDescription}-${item.output.slice(0, 20)}`} className="detail-card evidence-card">
                  <p className="muted">{item.caseDescription}</p>
                  <p>{item.output}</p>
                </article>
              ))
            ) : (
              <p className="muted">Evidence snippets will appear here when the assessment stores model output.</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel card report-section">
        <SectionHeader
          title="Checks Reviewed"
          subtitle="Each row below represents a user-friendly review item from the assessment."
        />
        <div className="stack compact-stack">
          {run.cases.length === 0 ? (
            <p className="muted">No detailed checks were recorded for this run.</p>
          ) : (
            run.cases.map((evalCase) => {
              const caseStatus = evalCase.assertions.every((assertion) => assertion.status === "pass") ? "passed" : "failed";
              return (
                <article key={evalCase.id} className="detail-card case-card">
                  <div className="case-card-header">
                    <div>
                      <h3>{evalCase.description}</h3>
                      <p className="muted">Model: {evalCase.provider}</p>
                    </div>
                    <StatusPill status={caseStatus} />
                  </div>
                  <div className="stack compact-stack">
                    {evalCase.assertions.map((assertion) => (
                      <div key={assertion.id} className="assertion-card">
                        <div className="assertion-topline">
                          <strong>{assertion.provider}</strong>
                          <StatusPill status={assertion.status} />
                        </div>
                        <p className="assertion-message">{assertion.message}</p>
                        {assertion.output ? <div className="evidence-output">{assertion.output}</div> : null}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="grid-2">
        <div className="panel card report-section">
          <SectionHeader title="Evidence Files" subtitle="Saved files that can be used for deeper review or export." />
          <ul className="plain-list">
            {run.artifacts.map((artifact) => (
              <li key={artifact.id}>
                <strong>{artifact.kind.toUpperCase()}</strong> {artifact.path} <span className="muted">({artifact.sizeBytes} bytes)</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel card report-section">
          <SectionHeader title="Technical Details" subtitle="Expandable raw execution notes for engineering review." />
          <details className="technical-details">
            <summary>Show technical execution log</summary>
            <ul className="plain-list technical-log">
              {run.logs.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        </div>
      </section>
    </div>
  );
}
