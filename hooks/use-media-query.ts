"use client";

import * as React from "react";

/**
 * useMediaQuery ÚNICO do app (SSR-safe via useSyncExternalStore).
 * Antes vivia copiado em action-wizard, calendar-view e meta-wizard.
 * Para o breakpoint mobile padrão, use useIsMobile (hooks/use-mobile).
 */
export function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    [query]
  );
  const getSnapshot = React.useCallback(
    () => window.matchMedia(query).matches,
    [query]
  );
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}
