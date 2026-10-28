"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, TrendingUp, Package, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import styles from "./SideMenu.module.scss";

const SIDEBAR_STORAGE_KEY = "moonie_kawaai_sidebar_open";

const menuItems = [
  { href: "/", label: "POS", match: "/pos", icon: ShoppingCart },
  { href: "/sales", label: "Ventas", match: "/sales", icon: TrendingUp },
  { href: "/pages/inventory", label: "Inventario", match: "/inventory", icon: Package },
];

export default function SideMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOpen(localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "closed");
  }, []);

  const toggleSidebar = () => {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "open" : "closed");
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
        </div>
      </aside>

    </>
  );
}
