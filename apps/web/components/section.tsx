const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "In progress",
  passed: "Passed",
  failed: "Needs attention",
  errored: "Could not complete",
  skipped: "Skipped",
  pass: "Passed",
  fail: "Needs attention",
  success: "Passed",
  error: "Could not complete",
  accepted: "Accepted",
  ignored: "Ignored"
};

export function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        <p className="section-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill-${status}`}>{STATUS_LABELS[status] || status.replaceAll("_", " ")}</span>;
}
