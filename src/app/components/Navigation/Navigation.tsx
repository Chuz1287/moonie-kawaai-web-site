"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ShoppingCart, TrendingUp, Package, Images, Moon, Sun } from "lucide-react";
import styles from "./Navigation.module.scss";

const themeChangeEvent = "moonie-theme-change";

function subscribeToMount() {
  return () => {};
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(themeChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(themeChangeEvent, callback);
  };
}

function readTheme(): "light" | "dark" {
  return localStorage.getItem("theme") === "light" ? "light" : "dark";
}

export default function Navigation() {
  const pathname = usePathname();
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, () => "dark");
  const mounted = useSyncExternalStore(subscribeToMount, () => true, () => false);

  useEffect(() => {
    const htmlElement = document.documentElement;
    htmlElement.classList.remove("light", "dark");
    htmlElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
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
        href="/events"
        className={`${styles.navItem} ${pathname.includes("/events") ? styles.active : ""}`}
        aria-current={pathname.includes("/events") ? "page" : undefined}
      >
        <CalendarDays size={24} />
        <span className={styles.label}>Eventos</span>
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

      <Link
        href="/media"
        className={`${styles.navItem} ${pathname.includes("/media") ? styles.active : ""}`}
        aria-current={pathname.includes("/media") ? "page" : undefined}
      >
        <Images size={24} />
        <span className={styles.label}>Imágenes</span>
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
