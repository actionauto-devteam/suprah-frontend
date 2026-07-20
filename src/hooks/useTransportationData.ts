import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
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

interface TransportationFilters {
  shipmentStatus?: string;
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
  const [isLoading, setIsLoading] = React.useState(true);
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
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [hasNewEntries, setHasNewEntries] = React.useState(false);

  const { getToken, isLoaded, isSignedIn } = useAuth();

  // Keep current page/limit in refs so socket handler always sees latest values
  const loadsPageRef = React.useRef(loadsPage);
  const loadsLimitRef = React.useRef(loadsLimit);
  const shipmentStatusRef = React.useRef(shipmentStatus);
  const quotesPageRef = React.useRef(quotesPage);
  const quotesLimitRef = React.useRef(quotesLimit);

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
            v.image ||
            "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop",
          location: v.location || "Unknown",
          color: v.color || "N/A",
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

  // ── Fetch shipments (specific page+limit, no loading state) ───────────────

  const fetchLoads = React.useCallback(
    async (
      page: number,
      limit: number,
      status: string = shipmentStatusRef.current,
    ) => {
      const config = await getAuthConfig();
      if (!config) return;
      const params: Record<string, string | number> = { page, limit };
      if (status && status !== "all") {
        params.status = status;
      }
      const res = await apiClient.get("/api/loads", { ...config, params });
      const raw = res.data?.data ?? res.data;
      const { items, pagination } = extractPaginatedItems<Load>(
        raw,
        "loads",
      );
      setLoads(items);
      setLoadsPagination(pagination);
    },
    [getAuthConfig],
  );

  // ── Fetch quotes (specific page+limit, no loading state) ──────────────────

  const fetchQuotes = React.useCallback(
    async (page: number, limit: number) => {
      const config = await getAuthConfig();
      if (!config) return;
      const res = await apiClient.get("/api/quotes", {
        ...config,
        params: { page, limit },
      });
      const raw = res.data?.data ?? res.data;
      const { items, pagination } = extractPaginatedItems<Quote>(raw, "quotes");
      setQuotes(items);
      setQuotesPagination(pagination);
    },
    [getAuthConfig],
  );

  // ── Core fetch (initial + full refresh) ───────────────────────────────────

  const fetchData = React.useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!isSignedIn) {
        if (silent) setIsSilentRefreshing(false);
        else setIsLoading(false);
        setError(isLoaded ? "Please sign in to view transportation records." : null);
        return;
      }

      if (silent) setIsSilentRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const config = await getAuthConfig();
        if (!config) {
          throw new Error("Authentication is required to load transportation records.");
        }

        const [loadsResult, quotesResult, vehiclesResult, statsResult] =
          await Promise.allSettled([
            apiClient.get("/api/loads", {
              ...config,
              params: {
                page: loadsPageRef.current,
                limit: loadsLimitRef.current,
                ...(shipmentStatusRef.current !== "all"
                  ? { status: shipmentStatusRef.current }
                  : {}),
              },
            }),
            apiClient.get("/api/quotes", {
              ...config,
              params: {
                page: quotesPageRef.current,
                limit: quotesLimitRef.current,
              },
            }),
            apiClient.get("/api/vehicles", {
              ...config,
              params: { status: "all", page: 1, limit: 1000 },
            }),
            apiClient.get("/api/loads/stats", config),
          ]);

        if (loadsResult.status === "rejected" && quotesResult.status === "rejected") {
          throw loadsResult.reason || quotesResult.reason || new Error("Failed to load transportation data");
        }

        const rawLoads =
          loadsResult.status === "fulfilled"
            ? loadsResult.value.data?.data ?? loadsResult.value.data
            : [];
        const rawQuotes =
          quotesResult.status === "fulfilled"
            ? quotesResult.value.data?.data ?? quotesResult.value.data
            : [];

        const { items: loadsData, pagination: loadsPag } =
          extractPaginatedItems<Load>(rawLoads, "loads");
        const { items: quotesData, pagination: quotesPag } =
          extractPaginatedItems<Quote>(rawQuotes, "quotes");

        setLoads(loadsData);
        setLoadsPagination(loadsPag);
        setQuotes(quotesData);
        setQuotesPagination(quotesPag);

        if (vehiclesResult.status === "fulfilled") {
          const vehiclesResponse =
            vehiclesResult.value.data?.data ?? vehiclesResult.value.data;
          const vehicleData =
            vehiclesResponse?.vehicles || vehiclesResponse || [];
          setVehicles(transformVehicles(vehicleData));
        } else if (!silent) {
          setVehicles([]);
        }

        if (statsResult.status === "fulfilled") {
          const statsData = statsResult.value.data?.data ?? statsResult.value.data;
          if (statsData && typeof statsData === "object") setStats(statsData);
        }

        setLastUpdated(new Date());
        isInitializedRef.current = true;
      } catch (err) {
        const axiosError = err as AxiosError;
        const msg =
          (axiosError.response?.data as any)?.message ||
          axiosError.message ||
          "Failed to load data";
        setError(msg);
        if (!silent) {
          setLoads([]);
          setQuotes([]);
          setVehicles([]);
        }
      } finally {
        if (silent) setIsSilentRefreshing(false);
        else setIsLoading(false);
      }
    },
    [getAuthConfig, transformVehicles, isSignedIn],
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

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || !isInitializedRef.current) return;
    setLoadsPage(1);
    fetchLoads(1, loadsLimitRef.current, shipmentStatus).catch(
      () => { },
    );
  }, [shipmentStatus, isLoaded, isSignedIn, fetchLoads]);

  // ── Socket realtime ────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    const connectSocket = async () => {
      try {
        const token = await getToken();
        if (cancelled || !token) return;
        const sock = initializeSocket(token);

        sock.on("load:change", () => {
          if (cancelled) return;
          setIsSilentRefreshing(true);
          Promise.all([
            fetchLoads(
              loadsPageRef.current,
              loadsLimitRef.current,
              shipmentStatusRef.current,
            ),
            // also refresh stats
            getAuthConfig().then((cfg) =>
              cfg
                ? apiClient.get("/api/loads/stats", cfg).then((r) => {
                  const d = r.data?.data ?? r.data;
                  if (d && typeof d === "object") setStats(d);
                })
                : null,
            ),
          ])
            .catch(() => { })
            .finally(() => {
              if (!cancelled) setIsSilentRefreshing(false);
              setLastUpdated(new Date());
              setHasNewEntries(true);
            });
        });

        sock.on("quote:change", () => {
          if (cancelled) return;
          setIsSilentRefreshing(true);
          fetchQuotes(quotesPageRef.current, quotesLimitRef.current)
            .catch(() => { })
            .finally(() => {
              if (!cancelled) setIsSilentRefreshing(false);
              setLastUpdated(new Date());
              setHasNewEntries(true);
            });
        });
      } catch { }
    };

    connectSocket();

    return () => {
      cancelled = true;
      const { getSocket } = require("@/lib/socket.client");
      const sock = getSocket();
      if (sock) {
        sock.off("shipment:change");
        sock.off("quote:change");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const dismissNewEntries = React.useCallback(
    () => setHasNewEntries(false),
    [],
  );

  // ── Pagination setters — call fetch DIRECTLY (no extra render cycle) ───────

  const changeLoadsPage = React.useCallback(
    async (page: number) => {
      setLoadsPage(page);
      try {
        await fetchLoads(page, loadsLimitRef.current);
      } catch { }
    },
    [fetchLoads],
  );

  const changeLoadsLimit = React.useCallback(
    async (limit: PerPageOption) => {
      setLoadsPage(1);
      setLoadsLimit(limit);
      loadsLimitRef.current = limit;
      try {
        await fetchLoads(1, limit);
      } catch { }
    },
    [fetchLoads],
  );

  const changeQuotesPage = React.useCallback(
    async (page: number) => {
      setQuotesPage(page);
      try {
        await fetchQuotes(page, quotesLimitRef.current);
      } catch { }
    },
    [fetchQuotes],
  );

  const changeQuotesLimit = React.useCallback(
    async (limit: PerPageOption) => {
      setQuotesPage(1);
      setQuotesLimit(limit);
      quotesLimitRef.current = limit;
      try {
        await fetchQuotes(1, limit);
      } catch { }
    },
    [fetchQuotes],
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
        await apiClient.post(`/api/quotes/${quoteId}/convert-to-load`, {}, config ?? undefined);
        setQuotes((prev) => prev.filter((q) => q._id !== quoteId));
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
    [getAuthConfig],
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

      /*
       * Refresh in the background so the local page and pagination match the
       * server without keeping the confirmation button in a loading state.
       */
      void fetchQuotes(
        quotesPageRef.current,
        quotesLimitRef.current,
      ).catch((refreshError) => {
        console.error(
          "Quote deleted, but the quote list could not be refreshed:",
          refreshError,
        );
      });
    },
    [getAuthConfig, fetchQuotes],
  );

  const handleDeleteLoad = React.useCallback(
    async (loadId: string) => {
      try {
        const config = await getAuthConfig();
        await apiClient.delete(
          `/api/loads/${loadId}`,
          config ?? undefined,
        );
        setLoads((prev) => prev.filter((s) => s._id !== loadId));
        setStats((prev) => ({ ...prev, all: Math.max(0, prev.all - 1) }));
      } catch (err) {
        const axiosError = err as AxiosError;
        throw new Error(
          "Failed to delete load: " +
          ((axiosError.response?.data as any)?.message ||
            axiosError.message ||
            "Unknown error"),
        );
      }
    },
    [getAuthConfig],
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
        setQuotes((prev) =>
          prev.map((q) => (q._id === quoteId ? { ...q, ...data } : q)),
        );
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
    [getAuthConfig],
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
        setLoads((prev) =>
          prev.map((s) => (s._id === loadId ? { ...s, ...data } : s)),
        );
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
    [getAuthConfig],
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
    lastUpdated,
    hasNewEntries,
    dismissNewEntries,
    fetchData,
    handleCalculateQuote,
    handleConvertToLoad,
    handleDeleteQuote,
    handleDeleteLoad,
    handleUpdateQuote,
    handleUpdateLoad,
  };
}