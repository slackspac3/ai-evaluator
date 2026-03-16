import type { ReactNode } from "react";

export function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <strong className="mt-3 block text-3xl text-slate-950">{value}</strong>
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}
