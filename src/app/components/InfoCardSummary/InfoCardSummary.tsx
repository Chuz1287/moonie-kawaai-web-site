"use client";

import type { InfoCardSummaryProps } from "./InfoCardSummary.logic";

export default function InfoCardSummary({
  label,
  value,
  textColor = "text-white",
  icon,
}: InfoCardSummaryProps) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
      {icon && <div className="mb-2">{icon}</div>}
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className={`mt-3 text-2xl font-black ${textColor}`}>{value}</p>
    </article>
  );
}
