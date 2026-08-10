import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Vehicle, ShippingQuoteFormData } from "@/types/inventory";
import { Load } from "@/types/load";
import { Quote } from "@/types/transportation";
import { LoadStats } from "@/lib/api/loads";
import { useAuth } from "@/providers/AuthProvider";
import { initializeSocket } from "@/lib/socket.client";

export interface TransportationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export const PER_PAGE_OPTIONS = [3, 5, 7] as const;
export type PerPageOption = (typeof PER_PAGE_OPTIONS)[number];

type TransportationView = "shipments" | "drafts" | "load-board";

interface TransportationFilters {
  shipmentStatus?: string;
  quoteStatus?: string;
  activeView?: string;
}

const LOADS_LIMIT_STORAGE_KEY = "transportation:loads:limit";
const QUOTES_LIMIT_STORAGE_KEY = "transportation:quotes:limit";

function getPersistedLimit(
  storageKey: string,
  fallback: PerPageOption,
): PerPageOption {
  if (typeof window === "undefined") return fallback;
  const rawValue = window.localStorage.getItem(storageKey);
  const parsedValue = Number(rawValue);
  return PER_PAGE_OPTIONS.includes(parsedValue as PerPageOption)
    ? (parsedValue as PerPageOption)
    : fallback;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractPaginatedItems<T>(
  raw: any,
  arrayKey?: string,
): { items: T[]; pagination: TransportationPagination | null } {
  if (raw && !Array.isArray(raw) && raw.pagination) {
    const items: T[] =
      (arrayKey ? raw[arrayKey] : null) || raw.data || raw.items || [];
    const rawPagination = raw.pagination;
    const total = Number(rawPagination.total ?? items.length ?? 0);
    const page = Number(rawPagination.page ?? 1);
    const limit = Number(rawPagination.limit ?? items.length ?? 0);
    const totalPages = Number(
      rawPagination.totalPages ??
      rawPagination.pages ??
      (limit > 0 ? Math.ceil(total / limit) : 1),
    );
    const hasMore =
      typeof rawPagination.hasMore === "boolean"
        ? rawPagination.hasMore
        : page < totalPages;

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore,
      },
    };
  }
  if (Array.isArray(raw)) {
    return { items: raw, pagination: null };
  }
  return { items: [], pagination: null };
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useTransportationData(filters: TransportationFilters = {}) {
  const shipmentStatus = filters.shipmentStatus || "all";
  const quoteStatus = filters.quoteStatus || "all";
  const activeView: TransportationView =
    filters.activeView === "drafts" || filters.activeView === "load-board"
      ? filters.activeView
      : "shipments";
  const [isLoading, setIsLoading] = React.useState(activeView !== "load-board");
  const [isSilentRefreshing, setIsSilentRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [loads, setLoads] = React.useState<Load[]>([]);
  const [loadsPagination, setLoadsPagination] =
    React.useState<TransportationPagination | null>(null);
  const [loadsPage, setLoadsPage] = React.useState(1);
  const [loadsLimit, setLoadsLimit] = React.useState<PerPageOption>(
    () => getPersistedLimit(LOADS_LIMIT_STORAGE_KEY, 5),
  );

  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [quotesPagination, setQuotesPagination] =
    React.useState<TransportationPagination | null>(null);
  const [quotesPage, setQuotesPage] = React.useState(1);
  const [quotesLimit, setQuotesLimit] = React.useState<PerPageOption>(() =>
    getPersistedLimit(QUOTES_LIMIT_STORAGE_KEY, 5),
  );

  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [stats, setStats] = React.useState<LoadStats>({
    all: 0,
    Posted: 0,
    Assigned: 0,
    "In-Transit": 0,
    Delivered: 0,
    Cancelled: 0,
  });
  const [quoteStats, setQuoteStats] = React.useState<Record<string, number>>({
    all: 0,
    pending: 0,
    accepted: 0,
    booked: 0,
    rejected: 0,
  });
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [hasNewEntries, setHasNewEntries] = React.useState(false);
  const [deletingLoadId, setDeletingLoadId] = React.useState<string | null>(
    null,
  );

  const { getToken, isLoaded, isSignedIn } = useAuth();

  // Keep current page/limit in refs so socket handler always sees latest values
  const loadsPageRef = React.useRef(loadsPage);
  const loadsLimitRef = React.useRef(loadsLimit);
  const shipmentStatusRef = React.useRef(shipmentStatus);
  const quoteStatusRef = React.useRef(quoteStatus);
  const activeViewRef = React.useRef<TransportationView>(activeView);
  const quotesPageRef = React.useRef(quotesPage);
  const quotesLimitRef = React.useRef(quotesLimit);
  const loadsRequestIdRef = React.useRef(0);
  const quotesRequestIdRef = React.useRef(0);
  const hasLoadedLoadsRef = React.useRef(false);
  const hasLoadedQuotesRef = React.useRef(false);
  const loadSnapshotRef = React.useRef<{
    items: Load[];
    complete: boolean;
    total: number;
  } | null>(null);
  const quoteSnapshotRef = React.useRef<{
    items: Quote[];
    complete: boolean;
    total: number;
  } | null>(null);

  React.useEffect(() => {
    loadsPageRef.current = loadsPage;
  }, [loadsPage]);
  React.useEffect(() => {
    loadsLimitRef.current = loadsLimit;
  }, [loadsLimit]);
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        LOADS_LIMIT_STORAGE_KEY,
        String(loadsLimit),
      );
    }
  }, [loadsLimit]);
  React.useEffect(() => {
    shipmentStatusRef.current = shipmentStatus;
  }, [shipmentStatus]);
  React.useEffect(() => {
    quoteStatusRef.current = quoteStatus;
  }, [quoteStatus]);
  React.useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);
  React.useEffect(() => {
    quotesPageRef.current = quotesPage;
  }, [quotesPage]);
  React.useEffect(() => {
    quotesLimitRef.current = quotesLimit;
  }, [quotesLimit]);
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        QUOTES_LIMIT_STORAGE_KEY,
        String(quotesLimit),
      );
    }
  }, [quotesLimit]);

  const isInitializedRef = React.useRef(false);

  // ── Vehicle transform ──────────────────────────────────────────────────────

  const transformVehicles = React.useCallback(
    (vehicleData: any[]): Vehicle[] => {
      return vehicleData.map((v: any) => {
        let vehicleId: string;
        if (typeof v._id === "object" && v._id !== null)
          vehicleId = v._id.toString();
        else if (v.id) vehicleId = String(v.id);
        else if (v._id) vehicleId = String(v._id);
        else vehicleId = `temp-${Math.random()}`;

        return {
          id: vehicleId,
          stockNumber: v.stockNumber || "N/A",
          year: v.year || 0,
          make: v.make || "Unknown",
          model: v.modelName || v.model || "Unknown",
          trim: v.trim || "",
          price: v.price || 0,
          mileage: v.mileage || 0,
          vin: v.vin || "N/A",
          image:
            v.images?.[0] ||
            v.image ||
            "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop",
          location: v.location || "Unknown",
          color: v.exteriorColor || v.color || "N/A",
          transmission: v.transmission || "Automatic",
          fuelType: v.fuelType || "Gasoline",
        };
      });
    },
    [],
  );

  // ── Auth header helper ─────────────────────────────────────────────────────

  const getAuthConfig = React.useCallback(async () => {
    const token = await getToken();
    if (!token) return null;
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [getToken]);

  const paginateItems = React.useCallback(
    <T,>(items: T[], page: number, limit: number) => {
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
      const boundedPage = Math.max(1, Math.min(page, totalPages));
      const start = (boundedPage - 1) * limit;
      return {
        items: items.slice(start, start + limit),
        pagination: {
          page: boundedPage,
          limit,
          total,
          totalPages,
          hasMore: boundedPage < totalPages,
        } satisfies TransportationPagination,
      };
    },
    [],
  );

  const getLoadSnapshotItems = React.useCallback(
    (status: string) => {
      const snapshot = loadSnapshotRef.current;
      if (!snapshot?.complete) return null;
      return status && status !== "all"
        ? snapshot.items.filter((load) => load.status === status)
        : snapshot.items;
    },
    [],
  );

  const getQuoteSnapshotItems = React.useCallback(
    (status: string) => {
      const snapshot = quoteSnapshotRef.current;
      if (!snapshot?.complete) return null;
      return status && status !== "all"
        ? snapshot.items.filter(
            (quote) => String(quote.status).toLowerCase() === status.toLowerCase(),
          )
        : snapshot.items;
    },
    [],
  );

  const applyLoadSnapshot = React.useCallback(
    (status: string, page: number, limit: number) => {
      const matching = getLoadSnapshotItems(status);
      if (!matching) return false;
      const next = paginateItems(matching, page, limit);
      setLoads(next.items);
      setLoadsPagination(next.pagination);
      setLoadsPage(next.pagination.page);
      loadsPageRef.current = next.pagination.page;
      hasLoadedLoadsRef.current = true;
      return true;
    },
    [getLoadSnapshotItems, paginateItems],
  );

  const applyQuoteSnapshot = React.useCallback(
    (status: string, page: number, limit: number) => {
      const matching = getQuoteSnapshotItems(status);
      if (!matching) return false;
      const next = paginateItems(matching, page, limit);
      setQuotes(next.items);
      setQuotesPagination(next.pagination);
      setQuotesPage(next.pagination.page);
      quotesPageRef.current = next.pagination.page;
      hasLoadedQuotesRef.current = true;
      return true;
    },
    [getQuoteSnapshotItems, paginateItems],
  );

  // ── Fetch shipments (specific page+limit, no loading state) ───────────────

  const fetchLoads = React.useCallback(
    async (
      page: number,
      limit: number,
      status: string = shipmentStatusRef.current,
    ) => {
      const requestId = ++loadsRequestIdRef.current;
      const config = await getAuthConfig();
      if (!config) return;
      const params: Record<string, string | number> = { page, limit };
      if (status && status !== "all") {
        params.status = status;
      }
      const res = await apiClient.get("/api/loads", {
        ...config,
        params,
        timeout: 15_000,
      });
      if (requestId !== loadsRequestIdRef.current) return;
      const raw = res.data?.data ?? res.data;
      const { items, pagination } = extractPaginatedItems<Load>(
        raw,
        "loads",
      );
      setLoads(items);
      setLoadsPagination(pagination);
      hasLoadedLoadsRef.current = true;
    },
    [getAuthConfig],
  );

  // ── Fetch quotes (specific page+limit, no loading state) ──────────────────

  const fetchQuotes = React.useCallback(
    async (
      page: number,
      limit: number,
      status: string = quoteStatusRef.current,
    ) => {
      const requestId = ++quotesRequestIdRef.current;
      const config = await getAuthConfig();
      if (!config) return;
      const res = await apiClient.get("/api/quotes", {
        ...config,
        params: {
          page,
          limit,
          ...(status && status !== "all" ? { status } : {}),
        },
        timeout: 15_000,
      });
      if (requestId !== quotesRequestIdRef.current) return;
      const raw = res.data?.data ?? res.data;
      const { items, pagination } = extractPaginatedItems<Quote>(raw, "quotes");
      setQuotes(items);
      setQuotesPagination(pagination);
      hasLoadedQuotesRef.current = true;
    },
    [getAuthConfig],
  );

  const refreshLoadSnapshot = React.useCallback(async () => {
    try {
      const config = await getAuthConfig();
      if (!config) return false;

      const res = await apiClient.get("/api/loads", {
        ...config,
        params: { page: 1, limit: 100 },
        timeout: 15_000,
      });

      const raw = res.data?.data ?? res.data;
      const { items, pagination } = extractPaginatedItems<Load>(raw, "loads");
      const total = Number(pagination?.total ?? items.length);
      loadSnapshotRef.current = {
        items,
        total,
        complete: total <= items.length,
      };

      return loadSnapshotRef.current.complete;
    } catch {
      return false;
    }
  }, [getAuthConfig]);

  const refreshQuoteSnapshot = React.useCallback(async () => {
    try {
      const config = await getAuthConfig();
      if (!config) return false;

      const res = await apiClient.get("/api/quotes", {
        ...config,
        params: { page: 1, limit: 100 },
        timeout: 15_000,
      });

      const raw = res.data?.data ?? res.data;
      const { items, pagination } = extractPaginatedItems<Quote>(raw, "quotes");
      const total = Number(pagination?.total ?? items.length);
      quoteSnapshotRef.current = {
        items,
        total,
        complete: total <= items.length,
      };

      const nextQuoteStats: Record<string, number> = {
        all: total,
        pending: 0,
        accepted: 0,
        booked: 0,
        rejected: 0,
      };

      for (const quote of items) {
        const status = String(quote.status || "").toLowerCase();
        if (status in nextQuoteStats) {
          nextQuoteStats[status] += 1;
        }
      }

      setQuoteStats(nextQuoteStats);
      return quoteSnapshotRef.current.complete;
    } catch {
      return false;
    }
  }, [getAuthConfig]);

  // ── Fetch stats (silent) ───────────────────────────────────────────────────

  const refreshStats = React.useCallback(async () => {
    try {
      const config = await getAuthConfig();
      if (!config) return;
      const res = await apiClient.get("/api/loads/stats", { ...config, timeout: 10_000 });
      const data = res.data?.data ?? res.data;
      if (data && typeof data === "object") setStats(data);
    } catch {
      // non-fatal — stale stats are corrected by the next socket refresh
    }
  }, [getAuthConfig]);

  const refreshVehicles = React.useCallback(async () => {
    try {
      const config = await getAuthConfig();
      if (!config) return;
      const res = await apiClient.get("/api/vehicles", {
        ...config,
        params: { status: "all", page: 1, limit: 1000 },
        timeout: 15_000,
      });
      const vehiclesResponse = res.data?.data ?? res.data;
      const vehicleData = vehiclesResponse?.vehicles || vehiclesResponse || [];
      setVehicles(transformVehicles(vehicleData));
    } catch {
      // Vehicle inventory is secondary to the active Transportation list.
      // Keep the last known vehicle data instead of blocking the page.
    }
  }, [getAuthConfig, transformVehicles]);

  // ── Core fetch (initial + full refresh) ───────────────────────────────────

  const fetchData = React.useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      const view = activeViewRef.current;

      if (!isSignedIn) {
        if (silent) setIsSilentRefreshing(false);
        else setIsLoading(false);
        setError(
          isLoaded ? "Please sign in to view transportation records." : null,
        );
        return;
      }

      if (silent) {
        setIsSilentRefreshing(true);
      } else {
        setIsLoading(view !== "load-board");
      }
      setError(null);

      try {
        // Warm both datasets concurrently. The active tab awaits only its own
        // snapshot, while the inactive tab is already being prepared in memory.
        const loadSnapshotPromise = loadSnapshotRef.current?.complete
          ? Promise.resolve(true)
          : refreshLoadSnapshot();
        const quoteSnapshotPromise = quoteSnapshotRef.current?.complete
          ? Promise.resolve(true)
          : refreshQuoteSnapshot();

        if (view === "shipments") {
          const snapshotReady = await loadSnapshotPromise;

          if (snapshotReady) {
            applyLoadSnapshot(
              shipmentStatusRef.current,
              loadsPageRef.current,
              loadsLimitRef.current,
            );
          } else {
            await fetchLoads(
              loadsPageRef.current,
              loadsLimitRef.current,
              shipmentStatusRef.current,
            );
          }

          void quoteSnapshotPromise;
        } else if (view === "drafts") {
          const snapshotReady = await quoteSnapshotPromise;

          if (snapshotReady) {
            applyQuoteSnapshot(
              quoteStatusRef.current,
              quotesPageRef.current,
              quotesLimitRef.current,
            );
          } else {
            await fetchQuotes(
              quotesPageRef.current,
              quotesLimitRef.current,
              quoteStatusRef.current,
            );
          }

          void loadSnapshotPromise;
        } else {
          // Board has its own hook, but prewarming both private datasets makes
          // later My Loads/Quotes tab switches immediate as well.
          void loadSnapshotPromise;
          void quoteSnapshotPromise;
        }

        setLastUpdated(new Date());
        isInitializedRef.current = true;

        // Secondary data never blocks the active result list.
        void refreshStats();
        if (!silent) {
          void refreshVehicles();
        }
      } catch (err) {
        const axiosError = err as AxiosError;
        const msg =
          (axiosError.response?.data as any)?.message ||
          axiosError.message ||
          "Failed to load data";
        setError(msg);
      } finally {
        isInitializedRef.current = true;
        if (silent) setIsSilentRefreshing(false);
        else setIsLoading(false);
      }
    },
    [
      applyLoadSnapshot,
      applyQuoteSnapshot,
      fetchLoads,
      fetchQuotes,
      isLoaded,
      isSignedIn,
      refreshLoadSnapshot,
      refreshQuoteSnapshot,
      refreshStats,
      refreshVehicles,
    ],
  );

  // ── Initial fetch ──────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setIsLoading(false);
      setError("Please sign in to view transportation records.");
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  // Status changes are applied from the warm snapshot before paint. If the
  // organization has more than 100 records, fall back to a silent server
  // request without showing a temporary empty/loading notice.
  React.useLayoutEffect(() => {
    if (
      activeView !== "shipments" ||
      !isLoaded ||
      !isSignedIn ||
      !isInitializedRef.current
    ) {
      return;
    }

    if (applyLoadSnapshot(shipmentStatus, 1, loadsLimitRef.current)) {
      setIsLoading(false);
      return;
    }

    // This only occurs on a first visit before the warm snapshot is ready, or
    // for very large datasets where the 100-record snapshot is incomplete.
    // Never show a false empty state; retain existing cards when possible.
    const showInitialSkeleton = !hasLoadedLoadsRef.current;
    if (showInitialSkeleton) setIsLoading(true);

    void fetchLoads(1, loadsLimitRef.current, shipmentStatus)
      .catch(() => { })
      .finally(() => {
        if (activeViewRef.current === "shipments") {
          setIsLoading(false);
        }
      });
  }, [
    activeView,
    shipmentStatus,
    isLoaded,
    isSignedIn,
    applyLoadSnapshot,
    fetchLoads,
  ]);

  React.useLayoutEffect(() => {
    if (
      activeView !== "drafts" ||
      !isLoaded ||
      !isSignedIn ||
      !isInitializedRef.current
    ) {
      return;
    }

    if (applyQuoteSnapshot(quoteStatus, 1, quotesLimitRef.current)) {
      setIsLoading(false);
      return;
    }

    const showInitialSkeleton = !hasLoadedQuotesRef.current;
    if (showInitialSkeleton) setIsLoading(true);

    void fetchQuotes(1, quotesLimitRef.current, quoteStatus)
      .catch(() => { })
      .finally(() => {
        if (activeViewRef.current === "drafts") {
          setIsLoading(false);
        }
      });
  }, [
    activeView,
    quoteStatus,
    isLoaded,
    isSignedIn,
    applyQuoteSnapshot,
    fetchQuotes,
  ]);

  // ── Socket realtime ────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const connectSocket = async () => {
      try {
        const token = await getToken();
        if (cancelled || !token) return;
        const sock = initializeSocket(token);

        const handleLoadChange = () => {
          if (cancelled) return;

          void Promise.all([
            refreshLoadSnapshot(),
            refreshStats(),
          ])
            .then(([snapshotComplete]) => {
              if (
                !cancelled &&
                snapshotComplete &&
                activeViewRef.current === "shipments"
              ) {
                applyLoadSnapshot(
                  shipmentStatusRef.current,
                  loadsPageRef.current,
                  loadsLimitRef.current,
                );
              }
            })
            .catch(() => { })
            .finally(() => {
              if (!cancelled) {
                setLastUpdated(new Date());
                setHasNewEntries(true);
              }
            });
        };

        const handleQuoteChange = () => {
          if (cancelled) return;

          void refreshQuoteSnapshot()
            .then((snapshotComplete) => {
              if (
                !cancelled &&
                snapshotComplete &&
                activeViewRef.current === "drafts"
              ) {
                applyQuoteSnapshot(
                  quoteStatusRef.current,
                  quotesPageRef.current,
                  quotesLimitRef.current,
                );
              }
            })
            .catch(() => { })
            .finally(() => {
              if (!cancelled) {
                setLastUpdated(new Date());
                setHasNewEntries(true);
              }
            });
        };

        sock.on("load:change", handleLoadChange);
        sock.on("quote:change", handleQuoteChange);

        cleanup = () => {
          sock.off("load:change", handleLoadChange);
          sock.off("quote:change", handleQuoteChange);
        };
      } catch { }
    };

    void connectSocket();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [
    isSignedIn,
    getToken,
    applyLoadSnapshot,
    applyQuoteSnapshot,
    refreshLoadSnapshot,
    refreshQuoteSnapshot,
    refreshStats,
  ]);

  const dismissNewEntries = React.useCallback(
    () => setHasNewEntries(false),
    [],
  );

  // ── Pagination setters — call fetch DIRECTLY (no extra render cycle) ───────

  const changeLoadsPage = React.useCallback(
    async (page: number) => {
      setError(null);
      if (applyLoadSnapshot(shipmentStatusRef.current, page, loadsLimitRef.current)) {
        return;
      }

      try {
        await fetchLoads(page, loadsLimitRef.current);
        setLoadsPage(page);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load the selected shipments page",
        );
      }
    },
    [applyLoadSnapshot, fetchLoads],
  );

  const changeLoadsLimit = React.useCallback(
    async (limit: PerPageOption) => {
      setError(null);
      loadsLimitRef.current = limit;
      setLoadsLimit(limit);

      if (applyLoadSnapshot(shipmentStatusRef.current, 1, limit)) {
        return;
      }

      try {
        await fetchLoads(1, limit);
        setLoadsPage(1);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to update shipment page size",
        );
      }
    },
    [applyLoadSnapshot, fetchLoads],
  );

  const changeQuotesPage = React.useCallback(
    async (page: number) => {
      setError(null);
      if (applyQuoteSnapshot(quoteStatusRef.current, page, quotesLimitRef.current)) {
        return;
      }

      try {
        await fetchQuotes(page, quotesLimitRef.current);
        setQuotesPage(page);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load the selected quotes page",
        );
      }
    },
    [applyQuoteSnapshot, fetchQuotes],
  );

  const changeQuotesLimit = React.useCallback(
    async (limit: PerPageOption) => {
      setError(null);
      quotesLimitRef.current = limit;
      setQuotesLimit(limit);

      if (applyQuoteSnapshot(quoteStatusRef.current, 1, limit)) {
        return;
      }

      try {
        await fetchQuotes(1, limit);
        setQuotesPage(1);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to update quote page size",
        );
      }
    },
    [applyQuoteSnapshot, fetchQuotes],
  );

  // ── Mutation handlers ──────────────────────────────────────────────────────

  const handleCalculateQuote = React.useCallback(
    async (formData: ShippingQuoteFormData) => {
      try {
        const isValidMongoId =
          formData.vehicleId && /^[0-9a-fA-F]{24}$/.test(formData.vehicleId);
        const payload: any = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          fromZip: formData.fromZip,
          toZip: formData.zipCode,
          fromAddress: formData.fromAddress,
          toAddress: formData.fullAddress,
          units: formData.units,
          enclosedTrailer: formData.enclosedTrailer,
          vehicleInoperable: formData.vehicleInoperable,
        };
        if (isValidMongoId) payload.vehicleId = formData.vehicleId;
        if (formData.vehicleId) {
          const vehicle = vehicles.find((v) => v.id === formData.vehicleId);
          if (vehicle) {
            payload.vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
            payload.vehicleImage = vehicle.image;
            payload.vin = vehicle.vin;
            payload.stockNumber = vehicle.stockNumber;
            payload.vehicleLocation = vehicle.location;
          }
        }
        const config = await getAuthConfig();
        const response = await apiClient.post(
          "/api/quotes",
          payload,
          config ?? undefined,
        );
        const data = response.data?.data || response.data;
        return data;
      } catch (err) {
        const axiosError = err as AxiosError;
        throw new Error(
          "Failed to create quote: " +
          ((axiosError.response?.data as any)?.message ||
            axiosError.message ||
            "Unknown error"),
        );
      }
    },
    [vehicles, getAuthConfig],
  );

  const handleConvertToLoad = React.useCallback(
    async (quoteId: string) => {
      try {
        const config = await getAuthConfig();
        await apiClient.post(
          `/api/quotes/${quoteId}/convert-to-load`,
          {},
          config ?? undefined,
        );

        // Keep the warm quote snapshot authoritative immediately. Converted
        // quotes remain in quote history as "booked" instead of disappearing
        // from the All/Booked views.
        if (quoteSnapshotRef.current) {
          quoteSnapshotRef.current = {
            ...quoteSnapshotRef.current,
            items: quoteSnapshotRef.current.items.map((quote) =>
              quote._id === quoteId
                ? ({ ...quote, status: "booked" } as Quote)
                : quote,
            ),
          };
        }

        setQuotes((prev) => {
          const updated = prev.map((quote) =>
            quote._id === quoteId
              ? ({ ...quote, status: "booked" } as Quote)
              : quote,
          );

          return quoteStatusRef.current === "all" ||
            quoteStatusRef.current === "booked"
            ? updated
            : updated.filter((quote) => quote._id !== quoteId);
        });

        void refreshQuoteSnapshot();
        void refreshLoadSnapshot();
        return true;
      } catch (err) {
        const axiosError = err as AxiosError;
        throw new Error(
          "Failed to convert quote to load: " +
          ((axiosError.response?.data as any)?.message ||
            axiosError.message ||
            "Unknown error"),
        );
      }
    },
    [getAuthConfig, refreshLoadSnapshot, refreshQuoteSnapshot],
  );

  const handleDeleteQuote = React.useCallback(
    async (quoteId: string) => {
      if (!quoteId) {
        throw new Error("Failed to delete quote: Quote ID is missing");
      }

      const config = await getAuthConfig();

      if (!config) {
        throw new Error("Failed to delete quote: Authentication required");
      }

      /*
       * Remove the quote immediately for a responsive production UI.
       * Keep the previous list so it can be restored if the delete fails.
       */
      let previousQuotes: Quote[] = [];

      setQuotes((currentQuotes) => {
        previousQuotes = currentQuotes;
        return currentQuotes.filter((quote) => quote._id !== quoteId);
      });

      setQuotesPagination((currentPagination) => {
        if (!currentPagination) return currentPagination;

        const total = Math.max(0, currentPagination.total - 1);
        const totalPages = Math.max(
          1,
          Math.ceil(total / Math.max(1, currentPagination.limit)),
        );

        return {
          ...currentPagination,
          total,
          totalPages,
          hasMore: currentPagination.page < totalPages,
        };
      });

      try {
        await apiClient.delete(`/api/quotes/${quoteId}`, {
          ...config,
          timeout: 15_000,
        });
      } catch (err) {
        const axiosError = err as AxiosError;
        const status = axiosError.response?.status;

        /*
         * A 404 means the quote is already gone. This is a successful final
         * state from the user's perspective, so do not restore the stale card.
         */
        if (status !== 404) {
          setQuotes(previousQuotes);

          setQuotesPagination((currentPagination) => {
            if (!currentPagination) return currentPagination;

            const total = currentPagination.total + 1;
            const totalPages = Math.max(
              1,
              Math.ceil(total / Math.max(1, currentPagination.limit)),
            );

            return {
              ...currentPagination,
              total,
              totalPages,
              hasMore: currentPagination.page < totalPages,
            };
          });

          throw new Error(
            "Failed to delete quote: " +
            ((axiosError.response?.data as any)?.message ||
              axiosError.message ||
              "Unknown error"),
          );
        }

        console.warn(
          `[Transportation] Quote ${quoteId} was already deleted on the server.`,
        );
      }

      if (quoteSnapshotRef.current) {
        quoteSnapshotRef.current = {
          ...quoteSnapshotRef.current,
          items: quoteSnapshotRef.current.items.filter(
            (quote) => quote._id !== quoteId,
          ),
          total: Math.max(0, quoteSnapshotRef.current.total - 1),
        };
      }

      // Rebuild counts/history silently so instant quote filtering stays fresh.
      void refreshQuoteSnapshot();
    },
    [getAuthConfig, refreshQuoteSnapshot],
  );

  const handleDeleteLoad = React.useCallback(
    async (loadId: string) => {
      /*
       * BUG FIX: this handler previously threw on failure, but nothing up the
       * chain caught it — ConfirmationModal fires onDelete without awaiting —
       * so failed deletes died as unhandled promise rejections and the button
       * appeared to "do nothing". The handler is now self-contained: it owns
       * its loading state, surfaces errors via toast, and never throws.
       */
      setDeletingLoadId(loadId);
      try {
        const config = await getAuthConfig();
        if (!config) {
          toast.error("Sign in again to delete this load.");
          return;
        }

        await apiClient.delete(`/api/loads/${loadId}`, {
          ...config,
          timeout: 15_000,
        });

        setLoads((prev) => prev.filter((s) => s._id !== loadId));
        if (loadSnapshotRef.current) {
          loadSnapshotRef.current = {
            ...loadSnapshotRef.current,
            items: loadSnapshotRef.current.items.filter(
              (load) => load._id !== loadId,
            ),
            total: Math.max(0, loadSnapshotRef.current.total - 1),
          };
        }
        toast.success("Load deleted.");

        // Reconcile the warm snapshot and counts silently.
        void refreshLoadSnapshot();
        void refreshStats();
      } catch (err) {
        const axiosError = err as AxiosError;
        const status = axiosError.response?.status;

        // Already gone on the server — a successful final state for the user
        if (status === 404) {
          setLoads((prev) => prev.filter((s) => s._id !== loadId));
          if (loadSnapshotRef.current) {
            loadSnapshotRef.current = {
              ...loadSnapshotRef.current,
              items: loadSnapshotRef.current.items.filter(
                (load) => load._id !== loadId,
              ),
              total: Math.max(0, loadSnapshotRef.current.total - 1),
            };
          }
          void refreshStats();
          return;
        }

        toast.error(
          (axiosError.response?.data as any)?.message ||
          axiosError.message ||
          "Failed to delete load. Please try again.",
        );
      } finally {
        setDeletingLoadId(null);
      }
    },
    [getAuthConfig, refreshLoadSnapshot, refreshStats],
  );

  const handleUpdateQuote = React.useCallback(
    async (quoteId: string, updatedQuote: Partial<Quote>) => {
      try {
        const config = await getAuthConfig();
        const response = await apiClient.put(
          `/api/quotes/${quoteId}`,
          updatedQuote,
          config ?? undefined,
        );
        const data = response.data?.data ?? response.data;
        if (quoteSnapshotRef.current) {
          quoteSnapshotRef.current = {
            ...quoteSnapshotRef.current,
            items: quoteSnapshotRef.current.items.map((quote) =>
              quote._id === quoteId ? { ...quote, ...data } : quote,
            ),
          };
        }
        setQuotes((prev) =>
          prev.map((q) => (q._id === quoteId ? { ...q, ...data } : q)),
        );
        void refreshQuoteSnapshot();
        return data;
      } catch (err) {
        const axiosError = err as AxiosError;
        throw new Error(
          "Failed to update quote: " +
          ((axiosError.response?.data as any)?.message ||
            axiosError.message ||
            "Unknown error"),
        );
      }
    },
    [getAuthConfig, refreshQuoteSnapshot],
  );

  const handleUpdateLoad = React.useCallback(
    async (loadId: string, updatedLoad: Partial<Load>) => {
      try {
        const config = await getAuthConfig();
        const response = await apiClient.put(
          `/api/loads/${loadId}`,
          updatedLoad,
          config ?? undefined,
        );
        const data = response.data?.data ?? response.data;
        if (loadSnapshotRef.current) {
          loadSnapshotRef.current = {
            ...loadSnapshotRef.current,
            items: loadSnapshotRef.current.items.map((load) =>
              load._id === loadId ? { ...load, ...data } : load,
            ),
          };
        }
        setLoads((prev) =>
          prev.map((s) => (s._id === loadId ? { ...s, ...data } : s)),
        );
        void refreshLoadSnapshot();
        return data;
      } catch (err) {
        const axiosError = err as AxiosError;
        throw new Error(
          "Failed to update load: " +
          ((axiosError.response?.data as any)?.message ||
            axiosError.message ||
            "Unknown error"),
        );
      }
    },
    [getAuthConfig, refreshLoadSnapshot],
  );

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    isLoading,
    isSilentRefreshing,
    error,
    loads,
    loadsPagination,
    loadsPage,
    loadsLimit,
    changeLoadsPage,
    changeLoadsLimit,
    quotes,
    quotesPagination,
    quotesPage,
    quotesLimit,
    changeQuotesPage,
    changeQuotesLimit,
    vehicles,
    stats,
    quoteStats,
    lastUpdated,
    hasNewEntries,
    dismissNewEntries,
    fetchData,
    handleCalculateQuote,
    handleConvertToLoad,
    handleDeleteQuote,
    handleDeleteLoad,
    deletingLoadId,
    handleUpdateQuote,
    handleUpdateLoad,
  };
}