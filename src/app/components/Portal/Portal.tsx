"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribeNoop = () => () => {};

export default function Portal({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  if (!isClient) return null;

  return createPortal(children, document.body);
}
