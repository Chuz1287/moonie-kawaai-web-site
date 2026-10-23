"use client";

import { useEffect, useState } from "react";

const applyTheme = (newTheme: "light" | "dark") => {
  const html = document.documentElement;
  if (newTheme === "light") {
    html.classList.add("light");
    html.classList.remove("dark");
  } else {
    html.classList.add("dark");
    html.classList.remove("light");
  }
  localStorage.setItem("theme", newTheme);
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved && (saved === "light" || saved === "dark")) {
      setTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme("dark");
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  if (!mounted) return null;

  const themeLabels: Record<string, string> = {
    dark: "🌙 Dark",
    light: "☀️ Light",
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed right-4 top-4 z-50 rounded-lg border px-3 py-2 text-sm font-medium backdrop-blur transition-all duration-200 hover:border-[var(--accent-primary)]"
      style={{
        borderColor: "var(--border-color)",
        backgroundColor: "var(--surface-hover)",
        color: "var(--text-primary)",
      }}
      title={`Tema actual: ${themeLabels[theme]}`}
    >
      {themeLabels[theme]}
    </button>
  );
}
