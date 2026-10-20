"use client";

import Link from "next/link";

type SalesHeaderProps = {
  loading: boolean;
  onRefresh: () => void;
};

export default function SalesHeader({ loading, onRefresh }: SalesHeaderProps) {
  return (
    <header className="Header_Sales mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400">
          Historial
        </p>
        <h1 className="mt-2 text-3xl font-black text-white">Ventas</h1>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-violet-400 disabled:opacity-50"
        >
          Actualizar
        </button>
        <Link
          href="/"
          className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-violet-400 hover:text-white"
        >
          Volver al POS
        </Link>
      </div>
    </header>
  );
}
