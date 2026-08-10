import * as React from "react";
import { toast } from "sonner";
import {
  getLoads,
  getLoadStats,
  deleteLoad,
  LoadStats,
  LoadsPagination,
} from "@/lib/api/loads";
import { Load } from "@/types/load";
import { useAuth } from "@/providers/AuthProvider";
import { initializeSocket } from "@/lib/socket.client";
import { PER_PAGE_OPTIONS, PerPageOption } from "./useTransportationData";

const LOADS_LIMIT_STORAGE_KEY = "transportation:loads:limit";

const DEFAULT_LOAD_STATS: LoadStats = {
  all: 0,
  Posted: 0,
  Assigned: 0,
  "In-Transit": 0,
  Delivered: 0,
  Cancelled: 0,
};

function getPersistedLimit(fallback: PerPageOption): PerPageOption {
  if (typeof window === "undefined") return fallback;
  const rawValue = window.localStorage.getItem(LOADS_LIMIT_STORAGE_KEY);
  const parsedValue = Number(rawValue);
  return PER_PAGE_OPTIONS.includes(parsedValue as PerPageOption)
    ? (parsedValue as PerPageOption)
    : fallback;
}

function buildVehicleStats(loads: Load[]): LoadStats {
  const stats: LoadStats = {
    all: 0,
    Posted: 0,
    Assigned: 0,
    Accepted: 0,
    "Picked Up": 0,
    "In-Transit": 0,
    Delivered: 0,
    Cancelled: 0,
  };

  for (const load of loads) {
    const vehicleCount = Array.isArray(load.vehicles) ? load.vehicles.length : 0;
    stats.all += vehicleCount;

    if (load.status in stats && load.status !== "Draft") {
      const key = load.status as keyof LoadStats;
      stats[key] = Number(stats[key] ?? 0) + vehicleCount;
    }
  }

  return stats;
}

function matchesLoadSearch(load: Load, query: string) {
  if (!query) return true;
  const normalized = query.toLowerCase();
  const pickup = load.pickupLocation;
  const delivery = load.deliveryLocation;
  const vehicles = load.vehicles || [];

  return (
    load.loadNumber?.toLowerCase().includes(normalized) ||
    pickup.city?.toLowerCase().includes(normalized) ||
    pickup.state?.toLowerCase().includes(normalized) ||
    pickup.contactName?.toLowerCase().includes(normalized) ||
    delivery.city?.toLowerCase().includes(normalized) ||
    delivery.state?.toLowerCase().includes(normalized) ||
    delivery.contactName?.toLowerCase().includes(normalized) ||
    vehicles.some(
      (vehicle) =>
        vehicle.make?.toLowerCase().includes(normalized) ||
        vehicle.model?.toLowerCase().includes(normalized) ||
        vehicle.vin?.toLowerCase().includes(normalized),
    )
  );
}

export function useLoadsData(
  searchQuery?: string,
  selectedStatus?: string,
  enabled = true,
) {
  const [loads, setLoads] = React.useState<Load[]>([]);
  const [pagination, setPagination] = React.useState<LoadsPagination | null>(
    null,
  );
  const [stats, setStats] = React.useState<LoadStats>(DEFAULT_LOAD_STATS);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState<PerPageOption>(() =>
    getPersistedLimit(5),
  );
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const pageRef = React.useRef(page);
  const limitRef = React.useRef(limit);
  const requestIdRef = React.useRef(0);
  const snapshotRef = React.useRef<{
    items: Load[];
    complete: boolean;
    total: number;
  } | null>(null);

  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);

  React.useEffect(() => {
    limitRef.current = limit;
  }, [limit]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOADS_LIMIT_STORAGE_KEY, String(limit));
    }
  }, [limit]);

  const applySnapshot = React.useCallback(
    (
      status = selectedStatus || "all",
      query = searchQuery?.trim() || "",
      requestedPage = pageRef.current,
      requestedLimit = limitRef.current,
    ) => {
      const snapshot = snapshotRef.current;
      if (!snapshot?.complete) return false;

      const filtered = snapshot.items.filter((load) => {
        const matchesStatus =
          !status || status === "all" || load.status === status;
        return matchesStatus && matchesLoadSearch(load, query);
      });

      const total = filtered.length;
      const totalPages = Math.max(
        1,
        Math.ceil(total / Math.max(1, requestedLimit)),
      );
      const boundedPage = Math.max(1, Math.min(requestedPage, totalPages));
      const start = (boundedPage - 1) * requestedLimit;
      const nextLoads = filtered.slice(start, start + requestedLimit);

      setLoads(nextLoads);
      setPagination({
        page: boundedPage,
        limit: requestedLimit,
        total,
        totalPages,
        hasMore: boundedPage < totalPages,
      });
      setPage(boundedPage);
      pageRef.current = boundedPage;
      return true;
    },
    [searchQuery, selectedStatus],
  );

  const refreshStats = React.useCallback(async () => {
    try {
      const statsData = await getLoadStats({
        timeout: 10_000,
        params: {
          countBy: "vehicles",
        },
      });
      setStats(statsData);
    } catch {
      // Counts are secondary to the list.
    }
  }, []);

  const refreshSnapshot = React.useCallback(async () => {
    try {
      const result = await getLoads(
        { page: 1, limit: 100 },
        { timeout: 15_000 },
      );

      const items = result?.loads ?? [];
      const total = Number(result?.pagination?.total ?? items.length);

      snapshotRef.current = {
        items,
        total,
        complete: total <= items.length,
      };

      // For normal-size datasets this is the most reliable Board counter
      // source because it is derived from the exact same load records/cards.
      if (snapshotRef.current.complete) {
        setStats(buildVehicleStats(items));
      }

      return snapshotRef.current.complete;
    } catch {
      return false;
    }
  }, []);

  const fetchServer = React.useCallback(
    async (
      requestedPage = 1,
      requestedLimit = limitRef.current,
      status = selectedStatus,
      query = searchQuery,
    ) => {
      const requestId = ++requestIdRef.current;
      setError(null);

      try {
        const result = await getLoads(
          {
            status:
              status && status !== "all"
                ? status
                : undefined,
            q: query?.trim() || undefined,
            page: requestedPage,
            limit: requestedLimit,
          },
          { timeout: 15_000 },
        );

        if (requestId !== requestIdRef.current) return false;

        const nextLoads = result?.loads ?? [];
        const nextPagination = result?.pagination ?? {
          page: requestedPage,
          limit: requestedLimit,
          total: 0,
          totalPages: 1,
          hasMore: false,
        };

        setLoads(nextLoads);
        setPagination(nextPagination);
        setPage(requestedPage);
        pageRef.current = requestedPage;
        return true;
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return false;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load loads",
        );
        return false;
      }
    },
    [searchQuery, selectedStatus],
  );

  // Apply Board status/search changes from the warm snapshot before paint.
  // There is no visible status-change loader and no false empty-state flash.
  React.useLayoutEffect(() => {
    if (!enabled || !isLoaded || !isSignedIn) {
      setIsLoading(false);
      return;
    }

    if (
      applySnapshot(
        selectedStatus,
        searchQuery,
        1,
        limitRef.current,
      )
    ) {
      setIsLoading(false);
      return;
    }

    // The background preload may still be in flight on the very first Board
    // visit. Only that genuine initial/no-content case may use the skeleton.
    setIsLoading(loads.length === 0);

    let cancelled = false;
    void refreshSnapshot()
      .then((complete) => {
        if (cancelled) return false;

        if (
          complete &&
          applySnapshot(
            selectedStatus,
            searchQuery,
            1,
            limitRef.current,
          )
        ) {
          return true;
        }

        // Very large datasets (>100 records) fall back to the server silently.
        // Existing cards remain visible until the matching response replaces them.
        return fetchServer(
          1,
          limitRef.current,
          selectedStatus,
          searchQuery,
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    isLoaded,
    isSignedIn,
    selectedStatus,
    searchQuery,
    applySnapshot,
    fetchServer,
    refreshSnapshot,
  ]);

  // Realtime keeps the warm snapshot current without interrupting the UI.
  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void getToken().then((token) => {
      if (cancelled || !token) return;
      const socket = initializeSocket(token);

      const handleLoadChange = () => {
        if (cancelled) return;

        void Promise.all([refreshSnapshot(), refreshStats()]).then(
          ([complete]) => {
            if (
              !cancelled &&
              enabled &&
              complete
            ) {
              applySnapshot(
                selectedStatus,
                searchQuery,
                pageRef.current,
                limitRef.current,
              );
            }
          },
        );
      };

      socket.on("load:change", handleLoadChange);
      cleanup = () => {
        socket.off("load:change", handleLoadChange);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [
    enabled,
    isLoaded,
    isSignedIn,
    getToken,
    selectedStatus,
    searchQuery,
    applySnapshot,
    refreshSnapshot,
    refreshStats,
  ]);

  const changePage = React.useCallback(
    async (nextPage: number) => {
      if (
        applySnapshot(
          selectedStatus,
          searchQuery,
          nextPage,
          limitRef.current,
        )
      ) {
        return;
      }

      await fetchServer(
        nextPage,
        limitRef.current,
        selectedStatus,
        searchQuery,
      );
    },
    [applySnapshot, fetchServer, searchQuery, selectedStatus],
  );

  const changeLimit = React.useCallback(
    async (nextLimit: PerPageOption) => {
      limitRef.current = nextLimit;
      setLimit(nextLimit);

      if (
        applySnapshot(
          selectedStatus,
          searchQuery,
          1,
          nextLimit,
        )
      ) {
        return;
      }

      await fetchServer(1, nextLimit, selectedStatus, searchQuery);
    },
    [applySnapshot, fetchServer, searchQuery, selectedStatus],
  );

  const refreshLoads = React.useCallback(async () => {
    const complete = await refreshSnapshot();
    if (
      complete &&
      applySnapshot(
        selectedStatus,
        searchQuery,
        pageRef.current,
        limitRef.current,
      )
    ) {
      return true;
    }

    return fetchServer(
      pageRef.current,
      limitRef.current,
      selectedStatus,
      searchQuery,
    );
  }, [
    applySnapshot,
    fetchServer,
    refreshSnapshot,
    searchQuery,
    selectedStatus,
  ]);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDeleteLoad = React.useCallback(
    async (loadId: string) => {
      setDeletingId(loadId);
      try {
        await deleteLoad(loadId);
        setLoads((prev) => prev.filter((load) => load._id !== loadId));

        if (snapshotRef.current) {
          snapshotRef.current = {
            ...snapshotRef.current,
            items: snapshotRef.current.items.filter(
              (load) => load._id !== loadId,
            ),
            total: Math.max(0, snapshotRef.current.total - 1),
          };
        }

        toast.success("Load deleted.");

        void Promise.all([refreshSnapshot(), refreshStats()]).then(
          ([complete]) => {
            if (complete) {
              applySnapshot(
                selectedStatus,
                searchQuery,
                pageRef.current,
                limitRef.current,
              );
            }
          },
        );
      } catch (err: any) {
        const status = err?.response?.status;

        if (status === 404) {
          setLoads((prev) => prev.filter((load) => load._id !== loadId));
          void refreshStats();
          return;
        }

        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to delete load. Please try again.",
        );
      } finally {
        setDeletingId(null);
      }
    },
    [
      applySnapshot,
      refreshSnapshot,
      refreshStats,
      searchQuery,
      selectedStatus,
    ],
  );

  return {
    loads,
    pagination,
    page,
    limit,
    changePage,
    changeLimit,
    stats,
    isLoading,
    error,
    fetchLoads: refreshLoads,
    handleDeleteLoad,
    deletingId,
  };
}