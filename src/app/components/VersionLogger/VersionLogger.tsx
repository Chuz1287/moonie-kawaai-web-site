"use client";

import { useEffect, useRef } from "react";
import type { VersionLoggerProps } from "./VersionLogger.logic";

export default function VersionLogger({ version }: VersionLoggerProps) {
  const hasLoggedVersion = useRef(false);

  useEffect(() => {
    if (hasLoggedVersion.current) return;

    console.log(`POS Version: ${version}`);
    hasLoggedVersion.current = true;
  }, [version]);

  return null;
}
