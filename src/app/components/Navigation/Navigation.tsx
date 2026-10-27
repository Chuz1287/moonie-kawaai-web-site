"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, TrendingUp, Package, Moon, Sun } from "lucide-react";
import styles from "./Navigation.module.scss";

export default function Navigation() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") || "dark";
    setTheme(stored as "light" | "dark");
    
    const htmlElement = document.documentElement;
    htmlElement.classList.remove("light", "dark");
    htmlElement.classList.add(stored);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    const htmlElement = document.documentElement;
    htmlElement.classList.remove("light", "dark");
    htmlElement.classList.add(newTheme);
  };

  if (!mounted) return null;

  return (
    <footer className={styles.bottomNav}>
      <Link
        href="/"
        className={`${styles.navItem} ${pathname.includes("/pos") ? styles.active : ""}`}
        aria-current={pathname.includes("/pos") ? "page" : undefined}
      >
        <ShoppingCart size={24} />
        <span className={styles.label}>POS</span>
      </Link>

      <Link
        href="/sales"
        className={`${styles.navItem} ${pathname.includes("/sales") ? styles.active : ""}`}
        aria-current={pathname.includes("/sales") ? "page" : undefined}
      >
        <TrendingUp size={24} />
        <span className={styles.label}>Ventas</span>
      </Link>

      <Link
        href="/pages/inventory"
        className={`${styles.navItem} ${pathname.includes("/inventory") ? styles.active : ""}`}
        aria-current={pathname.includes("/inventory") ? "page" : undefined}
      >
        <Package size={24} />
        <span className={styles.label}>Inventario</span>
      </Link>

      <button
        type="button"
        onClick={toggleTheme}
        className={styles.navItem}
        aria-label={`Cambiar a tema ${theme === "dark" ? "claro" : "oscuro"}`}
      >
        {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
        <span className={styles.label}>Tema</span>
      </button>
    </footer>
  );
}
