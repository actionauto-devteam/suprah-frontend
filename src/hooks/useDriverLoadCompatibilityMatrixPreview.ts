"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import type { DriverLoadCompatibility } from "@/types/driver-tracking";
import type { DriverLoadLike } from "@/lib/driver-load-compatibility";

interface PreviewLoadEntry {
  key: string;
  load: DriverLoadLike;
}

interface Options {
  loads: PreviewLoadEntry[];
  driverIds: string[];
  enabled?: boolean;
  debounceMs?: number;
}

export function useDriverLoadCompatibilityMatrixPreview({
  loads,
  driverIds,
  enabled = true,
  debounceMs = 250,
}: Options) {
  const [compatibilityByLoadKey, setCompatibilityByLoadKey] = React.useState<
    Record<string, Record<string, DriverLoadCompatibility>>
  >({});
  const [isLoading, setIsLoading] = React.useState(false);

  const normalizedDriverIds = React.useMemo(
    () => [...new Set(driverIds.filter(Boolean))].sort(),
    [driverIds],
  );
  const normalizedLoads = React.useMemo(
    () => loads.filter((entry) => entry.key && entry.load).slice(0, 50),
    [loads],
  );

  const requestKey = React.useMemo(
    () =>
      JSON.stringify({
        driverIds: normalizedDriverIds,
        loads: normalizedLoads,
      }),
    [normalizedDriverIds, normalizedLoads],
  );

  React.useEffect(() => {
    if (!enabled || normalizedDriverIds.length === 0 || normalizedLoads.length === 0) {
      setCompatibilityByLoadKey({});
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
            loads: normalizedLoads,
          },
        );
        if (cancelled) return;
        const data = response.data?.data ?? response.data;
        setCompatibilityByLoadKey(data?.compatibilityByLoadKey ?? {});
      } catch {
        if (!cancelled) setCompatibilityByLoadKey({});
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [debounceMs, enabled, requestKey]);

  return { compatibilityByLoadKey, isLoading };
}