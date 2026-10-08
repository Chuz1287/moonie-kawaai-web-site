"use client";

import { useEffect, useRef } from "react";

type VersionLoggerProps = {
  version: string;
};

export default function VersionLogger({ version }: VersionLoggerProps) {
  const hasLoggedVersion = useRef(false);

  useEffect(() => {
    if (hasLoggedVersion.current) return;

    console.log(`POS Version: ${version}`);
    hasLoggedVersion.current = true;
  }, [version]);

  return null;
}
