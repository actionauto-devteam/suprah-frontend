"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import type { DriverLoadCompatibility } from "@/types/driver-tracking";
import type { DriverLoadLike } from "@/lib/driver-load-compatibility";

interface Options {
  load: DriverLoadLike | null | undefined;
  driverIds: string[];
  enabled?: boolean;
  debounceMs?: number;
}

export function useDriverLoadCompatibilityPreview({
  load,
  driverIds,
  enabled = true,
  debounceMs = 250,
}: Options) {
  const [compatibilityByDriverId, setCompatibilityByDriverId] = React.useState<
    Record<string, DriverLoadCompatibility>
  >({});
  const [isLoading, setIsLoading] = React.useState(false);

  const normalizedDriverIds = React.useMemo(
    () => [...new Set(driverIds.filter(Boolean))].sort(),
    [driverIds],
  );

  const requestKey = React.useMemo(
    () =>
      JSON.stringify({
        driverIds: normalizedDriverIds,
        load: load ?? null,
      }),
    [load, normalizedDriverIds],
  );

  React.useEffect(() => {
    if (!enabled || !load || normalizedDriverIds.length === 0) {
      setCompatibilityByDriverId({});
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.post(
          "/api/driver-tracking/compatibility-preview",
          {
            driverIds: normalizedDriverIds,
            load,
          },
        );
        if (cancelled) return;
        const data = response.data?.data ?? response.data;
        setCompatibilityByDriverId(data?.compatibilityByDriverId ?? {});
      } catch {
        // Preview is advisory only. Existing backend assignment enforcement is
        // still authoritative, so a preview failure must not break the page.
        if (!cancelled) setCompatibilityByDriverId({});
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [debounceMs, enabled, requestKey]);

  return { compatibilityByDriverId, isLoading };
}