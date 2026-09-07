"use client";

import * as React from "react";
import { useUser } from "@/providers/AuthProvider";

export type InventoryViewMode = "grid" | "list";

const STORAGE_PREFIX = "suprah:inventory:view-mode";

function isInventoryViewMode(value: string | null): value is InventoryViewMode {
  return value === "grid" || value === "list";
}

/**
 * Keeps the Inventory presentation preference local to the signed-in user.
 *
 * Only the Grid/List preference is persisted. Search terms, filters, sort,
 * pagination, and selected vehicles intentionally remain session/navigation
 * state so reopening Inventory never surprises the user with stale criteria.
 */
export function useInventoryViewPreference(
  fallback: InventoryViewMode = "grid",
): readonly [InventoryViewMode, (mode: InventoryViewMode) => void] {
  const { user, isLoaded } = useUser();
  const [viewMode, setViewModeState] = React.useState<InventoryViewMode>(fallback);

  const storageKey = React.useMemo(
    () => `${STORAGE_PREFIX}:${user?.id || "guest"}`,
    [user?.id],
  );

  React.useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(storageKey);
      setViewModeState(isInventoryViewMode(stored) ? stored : fallback);
    } catch {
      // Storage can be unavailable in hardened/private browsing contexts.
      // The in-memory fallback keeps Inventory fully usable.
      setViewModeState(fallback);
    }
  }, [fallback, isLoaded, storageKey]);

  const setViewMode = React.useCallback(
    (mode: InventoryViewMode) => {
      setViewModeState(mode);
      if (typeof window === "undefined") return;

      try {
        window.localStorage.setItem(storageKey, mode);
      } catch {
        // Persisting a preference must never block changing the view.
      }
    },
    [storageKey],
  );

  return [viewMode, setViewMode] as const;
}