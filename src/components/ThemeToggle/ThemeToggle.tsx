"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    const html = document.documentElement;
    if (newTheme === "system") {
      html.classList.remove("light", "dark");
    } else if (newTheme === "light") {
      html.classList.add("light");
      html.classList.remove("dark");
    } else {
      html.classList.add("dark");
      html.classList.remove("light");
    }
    localStorage.setItem("theme", newTheme);
  };

  const toggleTheme = () => {
    const themes: ("light" | "dark" | "system")[] = ["dark", "light", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  if (!mounted) return null;

  const themeLabels: Record<string, string> = {
    dark: "🌙 Dark",
    light: "☀️ Light",
    system: "⚙️ System",
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed right-4 top-4 z-50 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-medium text-slate-200 backdrop-blur hover:border-violet-400 hover:text-violet-300"
      title={`Tema actual: ${themeLabels[theme]}`}
    >
      {themeLabels[theme]}
    </button>
  );
}
