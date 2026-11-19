"use client";

import BaseSkeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import styles from "./Skeleton.module.scss";

const theme = {
  baseColor: "var(--surface-hover)",
  highlightColor: "var(--border-color)",
};

type CountProps = {
  count?: number;
};

export function SkeletonCardGrid({ count = 6 }: CountProps) {
  return (
    <SkeletonTheme {...theme}>
      <div className={styles.cardGrid} role="status" aria-label="Cargando">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={styles.card}>
            <BaseSkeleton width="40%" height="0.625rem" />
            <BaseSkeleton width="80%" height="1rem" />
            <BaseSkeleton count={2} />
            <BaseSkeleton height="2.5rem" />
          </div>
        ))}
      </div>
    </SkeletonTheme>
  );
}

export function SkeletonRowList({ count = 4 }: CountProps) {
  return (
    <SkeletonTheme {...theme}>
      <div className={styles.rowList} role="status" aria-label="Cargando">
        {Array.from({ length: count }, (_, index) => (
          <BaseSkeleton key={index} height="3.5rem" borderRadius="1rem" />
        ))}
      </div>
    </SkeletonTheme>
  );
}

type LineProps = {
  width?: string;
  height?: string;
};

export function SkeletonLine({ width = "100%", height = "1rem" }: LineProps) {
  return (
    <SkeletonTheme {...theme}>
      <BaseSkeleton width={width} height={height} />
    </SkeletonTheme>
  );
}
