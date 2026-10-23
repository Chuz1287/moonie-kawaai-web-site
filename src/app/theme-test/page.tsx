"use client";

import { useEffect, useState } from "react";

export default function ThemeTestPage() {
  const [theme, setTheme] = useState<string>("detecting...");

  useEffect(() => {
    const html = document.documentElement;
    if (html.classList.contains("light")) {
      setTheme("Light Mode (Manual)");
    } else if (html.classList.contains("dark")) {
      setTheme("Dark Mode (Manual)");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "Dark Mode (System)" : "Light Mode (System)");
    }
  }, []);

  return (
    <main className="min-h-screen w-full px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-black">🎨 Theme Test Page</h1>

        <section className="mb-8 rounded-2xl border border-slate-700 p-6">
          <h2 className="mb-4 text-2xl font-bold">Current Theme</h2>
          <p className="text-lg">{theme}</p>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-700 p-6">
          <h2 className="mb-4 text-2xl font-bold">Background Test</h2>
          <div className="grid gap-4">
            <div className="rounded-xl border border-violet-400/50 p-4">
              <p className="text-sm font-semibold text-violet-300">Card with Border Only</p>
              <p className="mt-2 text-sm">Should inherit background from page</p>
            </div>
            <div className="rounded-xl bg-slate-800/30 border border-violet-400/50 p-4">
              <p className="text-sm font-semibold text-violet-300">Card with Translucent Background</p>
              <p className="mt-2 text-sm">30% opacity over page background</p>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-700 p-6">
          <h2 className="mb-4 text-2xl font-bold">Text Colors</h2>
          <div className="space-y-2">
            <p>Default foreground color (should be white in dark, dark in light)</p>
            <p className="text-slate-300">Dimmed text (slate-300)</p>
            <p className="text-emerald-300">Success text (emerald-300)</p>
            <p className="text-violet-300">Primary text (violet-300)</p>
            <p className="text-red-300">Error text (red-300)</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 p-6">
          <h2 className="mb-4 text-2xl font-bold">Button Test</h2>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg border border-slate-700 px-4 py-2 hover:border-violet-400">
              Default Button
            </button>
            <button className="rounded-lg border border-violet-400 bg-violet-500/20 px-4 py-2 hover:bg-violet-500/30">
              Primary Button
            </button>
            <button disabled className="rounded-lg border border-slate-700 px-4 py-2 opacity-50">
              Disabled Button
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
