"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, TrendingUp, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import styles from "./Navigation.module.scss";

export default function Navigation() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <nav className={styles.bottomNav}>
      <Link
        href="/pos"
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

      <button
        type="button"
        onClick={toggleTheme}
        className={styles.navItem}
        aria-label={`Cambiar a tema ${theme === "dark" ? "claro" : "oscuro"}`}
      >
        {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
        <span className={styles.label}>Tema</span>
      </button>
    </nav>
  );
}
