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
  return <span className={`pill pill-${status}`}>{status.replaceAll("_", " ")}</span>;
}

