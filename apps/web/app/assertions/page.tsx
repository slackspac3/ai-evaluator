import { listRuns } from "@/lib/data";
import { SectionHeader, StatusPill } from "@/components/section";

export const dynamic = "force-dynamic";

export default async function AssertionsPage() {
  const runs = await listRuns();
  const failedAssertions = runs.flatMap((run) =>
    run.cases.flatMap((evalCase) =>
      evalCase.assertions
        .filter((assertion) => assertion.status === "fail")
        .map((assertion) => ({ runId: run.id, caseDescription: evalCase.description, ...assertion }))
    )
  );

  return (
    <div className="stack">
      <section className="hero">
        <p className="muted">Failed Assertions Explorer</p>
        <h2>Inspect regressions without digging through raw CI logs.</h2>
      </section>

      <section className="panel card">
        <SectionHeader
          title="Failures"
          subtitle="Side-by-side drilldown target for promptfoo assertions that regressed on head compared with base."
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Case</th>
                <th>Status</th>
                <th>Score</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {failedAssertions.map((assertion) => (
                <tr key={assertion.id}>
                  <td>{assertion.runId}</td>
                  <td>{assertion.caseDescription}</td>
                  <td><StatusPill status={assertion.status} /></td>
                  <td>{assertion.score}</td>
                  <td>{assertion.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
