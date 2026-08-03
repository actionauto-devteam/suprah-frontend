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

function getPersistedLimit(fallback: PerPageOption): PerPageOption {
  if (typeof window === "undefined") return fallback;
  const rawValue = window.localStorage.getItem(LOADS_LIMIT_STORAGE_KEY);
  const parsedValue = Number(rawValue);
  return PER_PAGE_OPTIONS.includes(parsedValue as PerPageOption)
    ? (parsedValue as PerPageOption)
    : fallback;
}

export function useLoadsData(searchQuery?: string, selectedStatus?: string) {
  const [loads, setLoads] = React.useState<Load[]>([]);
  const [pagination, setPagination] = React.useState<LoadsPagination | null>(
    null,
  );
  const [stats, setStats] = React.useState<LoadStats>({
    all: 0,
    Posted: 0,
    Assigned: 0,
    "In-Transit": 0,
    Delivered: 0,
    Cancelled: 0,
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState<PerPageOption>(() =>
    getPersistedLimit(5),
  );
  const { isLoaded, isSignedIn, getToken } = useAuth();

  // Refs so socket handler always sees the latest page/limit
  const pageRef = React.useRef(page);
  const limitRef = React.useRef(limit);
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

  const fetchLoads = React.useCallback(
    async (p = 1, l = limitRef.current) => {
      setIsLoading(true);
      setError(null);
      try {
        const status =
          selectedStatus && selectedStatus !== "all"
            ? selectedStatus
            : undefined;
        const q = searchQuery?.trim() || undefined;
        const timeoutGuard = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Loading loads timed out. Please try again.")),
            20000,
          ),
        );
        const [result, statsData] = await Promise.race([
          Promise.all([
            getLoads({ status, q, page: p, limit: l }),
            getLoadStats(),
          ]),
          timeoutGuard,
        ]);
        setLoads(result?.loads ?? []);
        setPagination(
          result?.pagination ?? {
            page: p,
            limit: l,
            total: 0,
            totalPages: 1,
            hasMore: false,
          },
        );
        if (statsData) setStats(statsData);
        setPage(p);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load loads",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, selectedStatus],
  );

  // Debounced re-fetch when search/status changes — reset to page 1
  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const t = setTimeout(
      () => fetchLoads(1, limitRef.current),
      searchQuery ? 400 : 0,
    );
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, fetchLoads, searchQuery]);

  // Socket.IO — realtime load:change events
  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cleanup: (() => void) | undefined;

    getToken().then((token) => {
      if (!token) return;
      const socket = initializeSocket(token);

      const handleLoadChange = () => {
        fetchLoads(pageRef.current, limitRef.current);
        getLoadStats()
          .then(setStats)
          .catch(() => {});
      };

      socket.on("load:change", handleLoadChange);
      cleanup = () => {
        socket.off("load:change", handleLoadChange);
      };
    });

    return () => {
      cleanup?.();
    };
  }, [isLoaded, isSignedIn, getToken, fetchLoads]);

  const changePage = React.useCallback(
    (p: number) => {
      pageRef.current = p;
      fetchLoads(p, limitRef.current);
    },
    [fetchLoads],
  );

  const changeLimit = React.useCallback(
    (l: PerPageOption) => {
      limitRef.current = l;
      setLimit(l);
      fetchLoads(1, l);
    },
    [fetchLoads],
  );

  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDeleteLoad = React.useCallback(async (loadId: string) => {
    /*
     * BUG FIX: this previously had try/finally with NO catch, so any failed
     * delete became an unhandled promise rejection — the spinner stopped and
     * nothing else happened. Errors are now surfaced via toast, 404 is
     * treated as an already-deleted success, and the current page is
     * re-fetched afterwards so pagination stays in sync.
     */
    setDeletingId(loadId);
    try {
      await deleteLoad(loadId);
      setLoads((prev) => prev.filter((l) => l._id !== loadId));
      toast.success("Load deleted.");

      // Reconcile page contents + counts with the server
      void fetchLoads(pageRef.current, limitRef.current).catch(() => {});
      getLoadStats()
        .then(setStats)
        .catch(() => {});
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 404) {
        // Already gone on the server — remove locally and move on
        setLoads((prev) => prev.filter((l) => l._id !== loadId));
        getLoadStats()
          .then(setStats)
          .catch(() => {});
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
  }, [fetchLoads]);

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
    fetchLoads: () => fetchLoads(1, limitRef.current),
    handleDeleteLoad,
    deletingId,
  };
}