"use client";

import type { InfoCardSummaryProps } from "./InfoCardSummary.logic";
import styles from "./InfoCardSummary.module.scss";

export default function InfoCardSummary({
  label,
  value,
  textColor,
  icon,
}: InfoCardSummaryProps) {
  return (
    <article className={styles.scope}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <p className={styles.label}>
        {label}
      </p>
      <p className={`${styles.value} ${textColor || ""}`}>{value}</p>
    </article>
  );
}
