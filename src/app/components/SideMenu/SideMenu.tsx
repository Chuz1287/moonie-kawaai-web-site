"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ShoppingCart, TrendingUp, Package, Images, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import AppVersion from "../AppVersion";
import packageJson from "../../../../package.json";
import styles from "./SideMenu.module.scss";

const SIDEBAR_STORAGE_KEY = "moonie_kawaai_sidebar_open";
const sidebarChangeEvent = "moonie-sidebar-change";

function subscribeToMount() {
  return () => {};
}

function subscribeToSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(sidebarChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(sidebarChangeEvent, callback);
  };
}

function readSidebarState() {
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "closed";
}

const menuItems = [
  { href: "/", label: "POS", match: "/pos", icon: ShoppingCart },
  { href: "/events", label: "Eventos", match: "/events", icon: CalendarDays },
  { href: "/sales", label: "Ventas", match: "/sales", icon: TrendingUp },
  { href: "/pages/inventory", label: "Inventario", match: "/inventory", icon: Package },
  { href: "/media", label: "Imágenes", match: "/media", icon: Images },
];

export default function SideMenu() {
  const pathname = usePathname();
  const isOpen = useSyncExternalStore(subscribeToSidebar, readSidebarState, () => true);
  const mounted = useSyncExternalStore(subscribeToMount, () => true, () => false);

  const toggleSidebar = () => {
    const next = !isOpen;
    localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "open" : "closed");
    window.dispatchEvent(new Event(sidebarChangeEvent));
  };

  if (!mounted) return null;

  return (
    <>
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`} aria-label="Menú principal">
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.brand}>Moonie Kawaai</span>
            <button
              type="button"
              onClick={toggleSidebar}
              className={styles.toggle}
              aria-label={isOpen ? "Contraer menú" : "Expandir menú"}
              aria-expanded={isOpen}
            >
              {isOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
          </div>

          <nav className={styles.nav}>
            {menuItems.map((item) => {
              const isActive = pathname === item.href || pathname.includes(item.match);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.label}
                  title={item.label}
                >
                  <Icon size={20} />
                  <span className={styles.label}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <AppVersion version={packageJson.version} className={styles.version} />
        </div>
      </aside>

    </>
  );
}
